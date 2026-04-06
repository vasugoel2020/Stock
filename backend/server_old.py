import asyncio
import json
import os
import re
import time
import uuid
from datetime import datetime
from statistics import mean
from typing import Any

import yfinance as yf
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

PORT = int(os.getenv("PORT", "3001"))
CACHE_TTL_SECONDS = int(os.getenv("CACHE_TTL_SECONDS", "900"))
_RESPONSE_CACHE: dict[str, tuple[float, dict[str, Any]]] = {}

SECTOR_PE_BENCHMARKS = {
    "technology": 28.0,
    "financial services": 18.0,
    "energy": 14.0,
    "consumer cyclical": 30.0,
    "consumer defensive": 38.0,
    "industrials": 24.0,
    "basic materials": 18.0,
    "healthcare": 26.0,
    "real estate": 20.0,
    "utilities": 16.0,
    "communication services": 20.0,
}

app = FastAPI(title="Stock Analysis Backend")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def cache_get(key: str) -> dict[str, Any] | None:
    item = _RESPONSE_CACHE.get(key)
    if not item:
        return None
    created_at, value = item
    if time.time() - created_at > CACHE_TTL_SECONDS:
        _RESPONSE_CACHE.pop(key, None)
        return None
    return value


def cache_set(key: str, value: dict[str, Any]) -> dict[str, Any]:
    _RESPONSE_CACHE[key] = (time.time(), value)
    return value


def normalize_space(value: str | None) -> str:
    return re.sub(r"\s+", " ", (value or "")).strip()


def safe_float(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        if value != value:
            return None
        return float(value)
    text = str(value).strip().replace(",", "")
    if text in {"", "None", "null", "N/A", "-", "nan"}:
        return None
    try:
        number = float(text)
        if number != number:
            return None
        return number
    except ValueError:
        return None


def round_or_none(value: float | None, digits: int = 2) -> float | None:
    return None if value is None else round(value, digits)


def percent_change(current: float | None, previous: float | None) -> float | None:
    if current is None or previous in (None, 0):
        return None
    return round(((current - previous) / abs(previous)) * 100, 2)


def compact_currency(value: float | None, currency: str | None) -> str:
    if value is None:
        return "N/A"
    code = (currency or "INR").upper()
    sign = "-" if value < 0 else ""
    amount = abs(value)
    if amount >= 1_000_000_000_000:
        return f"{sign}{code} {amount / 1_000_000_000_000:.2f}T"
    if amount >= 1_000_000_000:
        return f"{sign}{code} {amount / 1_000_000_000:.2f}B"
    if amount >= 1_000_000:
        return f"{sign}{code} {amount / 1_000_000:.2f}M"
    return f"{sign}{code} {amount:,.2f}"


def format_date(value: Any) -> str | None:
    if value is None:
        return None
    if hasattr(value, "to_pydatetime"):
        value = value.to_pydatetime()
    if isinstance(value, datetime):
        return value.strftime("%d %b %Y")
    if isinstance(value, (int, float)):
        try:
            return datetime.fromtimestamp(value).strftime("%d %b %Y")
        except Exception:
            return None
    text = str(value).replace("Z", "")
    for fmt in ("%Y-%m-%d", "%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S"):
        try:
            return datetime.strptime(text[:19], fmt).strftime("%d %b %Y")
        except Exception:
            continue
    return text


def extract_query(payload: dict[str, Any]) -> str:
    for key in ("stock", "ticker", "symbol", "query"):
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()

    messages = payload.get("messages") or []
    texts: list[str] = []
    for message in messages:
        if not isinstance(message, dict) or message.get("role") != "user":
            continue
        content = message.get("content")
        if isinstance(content, str):
            texts.append(content)
        elif isinstance(content, list):
            for block in content:
                if isinstance(block, dict) and isinstance(block.get("text"), str):
                    texts.append(block["text"])

    combined = normalize_space(texts[-1] if texts else "")
    quoted = re.findall(r'"([^"]+)"', combined)
    if quoted:
        return quoted[-1].strip()

    combined = re.sub(r"(?i)^analyze this indian stock comprehensively:\s*", "", combined)
    combined = re.sub(r"(?i)return only json\.?", "", combined)
    combined = re.sub(r"(?i)^analyze\s+", "", combined)
    return combined.strip(" .")


def wrap_response(payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": f"msg_{uuid.uuid4().hex[:24]}",
        "type": "message",
        "role": "assistant",
        "content": [{"type": "text", "text": json.dumps(payload, ensure_ascii=True, indent=2)}],
    }


def strip_suffix(symbol: str) -> str:
    return re.sub(r"\.(NS|NSE|BO|BSE)$", "", symbol, flags=re.IGNORECASE)


def build_candidates(query: str) -> list[str]:
    cleaned = normalize_space(query).upper().replace(".NSE", ".NS").replace(".BSE", ".BO")
    if "." in cleaned:
        return [cleaned]
    if re.fullmatch(r"[A-Z0-9._-]{1,20}", cleaned):
        return [f"{cleaned}.NS", cleaned]
    return []


def ordered_columns(df: Any) -> list[Any]:
    try:
        return sorted(list(df.columns), reverse=True)
    except Exception:
        return []


def value_from_df(df: Any, row_names: list[str], column: Any) -> float | None:
    if df is None or getattr(df, "empty", True):
        return None
    row_map = {str(idx).lower(): idx for idx in df.index}
    for name in row_names:
        idx = row_map.get(name.lower())
        if idx is not None:
            return safe_float(df.at[idx, column])
    for idx in df.index:
        key = str(idx).lower()
        if any(name.lower() in key for name in row_names):
            return safe_float(df.at[idx, column])
    return None


def cagr_from_df(df: Any, row_names: list[str], points: int = 4) -> float | None:
    if df is None or getattr(df, "empty", True):
        return None
    values: list[float] = []
    for col in ordered_columns(df)[:points]:
        value = value_from_df(df, row_names, col)
        if value is not None and value > 0:
            values.append(value)
    if len(values) < 2:
        return None
    newest = values[0]
    oldest = values[-1]
    years = len(values) - 1
    if oldest <= 0 or years <= 0:
        return None
    return round((((newest / oldest) ** (1 / years)) - 1) * 100, 2)


def quarter_label(col: Any) -> str:
    if hasattr(col, "to_pydatetime"):
        col = col.to_pydatetime()
    if isinstance(col, datetime):
        month = col.month
        fiscal_year = col.year + 1 if month >= 4 else col.year
        quarter = 1 if 4 <= month <= 6 else 2 if 7 <= month <= 9 else 3 if 10 <= month <= 12 else 4
        return f"Q{quarter} FY{str(fiscal_year)[-2:]}"
    return "Recent Quarter"


def build_quarterly_results(q_income: Any, currency: str) -> list[dict[str, Any]]:
    if q_income is None or getattr(q_income, "empty", True):
        return []
    revenue_rows = ["Total Revenue", "Operating Revenue", "Revenue"]
    profit_rows = ["Net Income", "Net Income Common Stockholders", "Net Income Including Noncontrolling Interests"]
    cols = ordered_columns(q_income)
    results: list[dict[str, Any]] = []

    for idx, col in enumerate(cols[:2]):
        revenue = value_from_df(q_income, revenue_rows, col)
        pat = value_from_df(q_income, profit_rows, col)
        prev_col = cols[idx + 4] if len(cols) > idx + 4 else None
        prev_revenue = value_from_df(q_income, revenue_rows, prev_col) if prev_col is not None else None
        prev_pat = value_from_df(q_income, profit_rows, prev_col) if prev_col is not None else None
        results.append(
            {
                "quarter": quarter_label(col),
                "revenue": compact_currency(revenue, currency),
                "pat": compact_currency(pat, currency),
                "revenueGrowthYoY": percent_change(revenue, prev_revenue),
                "patGrowthYoY": percent_change(pat, prev_pat),
            }
        )
    return results


def get_news_items(ticker: Any, query: str) -> list[dict[str, Any]]:
    raw_news = []
    try:
        raw_news = ticker.news or []
    except Exception:
        raw_news = []
    if not raw_news and hasattr(yf, "Search"):
        try:
            raw_news = (yf.Search(query, max_results=0, news_count=5, raise_errors=False).news or [])
        except Exception:
            raw_news = []

    items: list[dict[str, Any]] = []
    for article in raw_news[:3]:
        payload = article.get("content") if isinstance(article.get("content"), dict) else article
        headline = normalize_space(payload.get("title") or article.get("title") or article.get("headline"))
        summary = normalize_space(payload.get("summary") or article.get("summary") or headline)
        corpus = f"{headline} {summary}".lower()
        pos = sum(word in corpus for word in ("beat", "growth", "strong", "profit", "win", "upgrade"))
        neg = sum(word in corpus for word in ("miss", "weak", "loss", "fall", "downgrade", "delay"))
        impact = "Positive" if pos > neg else "Negative" if neg > pos else "Neutral"
        if headline:
            items.append(
                {
                    "headline": headline,
                    "date": format_date(payload.get("pubDate") or article.get("providerPublishTime")) or "N/A",
                    "impact": impact,
                    "summary": summary or "N/A",
                }
            )
    return items


def validate_candidate(symbol: str) -> tuple[str, Any, dict[str, Any], Any] | None:
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info or {}
        history = ticker.history(period="1y", auto_adjust=False)
    except Exception:
        return None

    current_price = safe_float(info.get("currentPrice")) or safe_float(info.get("regularMarketPrice"))
    if current_price is None and history is not None and not history.empty:
        current_price = safe_float(history["Close"].dropna().iloc[-1])

    market_cap = safe_float(info.get("marketCap"))
    company_name = normalize_space(info.get("longName") or info.get("shortName"))

    if company_name and current_price is not None and market_cap is not None:
        return symbol, ticker, info, history
    return None


def resolve_symbol(query: str) -> tuple[str, Any, dict[str, Any], Any]:
    for candidate in build_candidates(query):
        checked = validate_candidate(candidate)
        if checked:
            return checked

    if hasattr(yf, "Search"):
        try:
            search = yf.Search(query, max_results=8, news_count=0, raise_errors=False)
            quotes = getattr(search, "quotes", []) or []
        except Exception:
            quotes = []
        ranked: list[str] = []
        for quote in quotes:
            symbol = normalize_space(quote.get("symbol") or quote.get("ticker")).upper()
            if not symbol:
                continue
            if symbol.endswith(".NS"):
                ranked.insert(0, symbol)
            else:
                ranked.append(symbol)
        seen: set[str] = set()
        for symbol in ranked:
            if symbol in seen:
                continue
            seen.add(symbol)
            checked = validate_candidate(symbol)
            if checked:
                return checked

    raise ValueError(f"Stock not found: {query}")


def safe_sector_pe(sector: str | None) -> float | None:
    if not sector:
        return None
    return SECTOR_PE_BENCHMARKS.get(sector.lower())


def compute_score(roe: float | None, debt_to_equity: float | None, pe: float | None) -> float:
    parts: list[float] = []
    if roe is not None:
        parts.append(9.0 if roe >= 18 else 7.0 if roe >= 12 else 5.0 if roe >= 8 else 3.0)
    if debt_to_equity is not None:
        parts.append(9.0 if debt_to_equity <= 0.5 else 7.0 if debt_to_equity <= 1 else 4.0)
    if pe is not None:
        parts.append(8.0 if pe <= 20 else 6.0 if pe <= 30 else 4.0)
    return round(mean(parts), 1) if parts else 0.0


def build_verdict(current_price: float | None, target_low: float | None, target_high: float | None, score: float, sentiment: str) -> dict[str, Any]:
    fair_value = round((target_low + target_high) / 2, 2) if target_low is not None and target_high is not None else None
    margin = percent_change(fair_value, current_price) if fair_value is not None and current_price is not None else None

    if score >= 7 and margin is not None and margin >= 8:
        action = "BUY"
    elif score <= 4 or margin is not None and margin <= -10:
        action = "SELL"
    else:
        action = "HOLD"

    confidence = 75 if action != "HOLD" else 65
    if sentiment == "Positive" and action == "BUY":
        confidence += 5
    if sentiment == "Negative" and action != "SELL":
        confidence -= 5
    confidence = max(55, min(90, confidence))

    return {
        "action": action,
        "confidence": confidence,
        "reasoning": "Recommendation is based on live Yahoo Finance price, valuation, leverage, profitability, and recent news sentiment.",
        "targetLow": target_low,
        "targetHigh": target_high,
        "targetHorizon": "12-18 months",
        "stopLoss": round_or_none(current_price * 0.9) if current_price is not None else None,
        "positionSize": "Medium (3-5%)" if action == "BUY" else "Small (2-3%)",
        "entryStrategy": "Buy on dips" if action == "BUY" else "Avoid fresh entry" if action == "SELL" else "SIP over 2-3 months",
        "exitTrigger": "Exit if earnings weaken materially, leverage rises sharply, or the valuation thesis changes.",
    }


def get_stock_data(symbol: str) -> dict[str, Any]:
    resolved_symbol, ticker, info, history = resolve_symbol(symbol)
    currency = normalize_space(info.get("financialCurrency") or info.get("currency")) or "INR"
    # After fetching history
    price_history = None
    if history is not None and not history.empty:
        monthly = history["Close"].resample("ME").last().dropna().tail(12)
        price_history = [round(float(v), 2) for v in monthly]


    current_price = safe_float(info.get("currentPrice")) or safe_float(info.get("regularMarketPrice"))
    if current_price is None and history is not None and not history.empty:
        current_price = safe_float(history["Close"].dropna().iloc[-1])

    previous_close = safe_float(info.get("previousClose"))
    if previous_close is None and history is not None and not history.empty:
        closes = history["Close"].dropna()
        if len(closes) >= 2:
            previous_close = safe_float(closes.iloc[-2])

    market_cap = safe_float(info.get("marketCap"))
    pe = safe_float(info.get("trailingPE"))
    roe = safe_float(info.get("returnOnEquity"))
    roe = round_or_none(roe * 100 if roe is not None and abs(roe) <= 1 else roe)
    debt_to_equity = round_or_none(safe_float(info.get("debtToEquity")))
    week_high = safe_float(info.get("fiftyTwoWeekHigh"))
    week_low = safe_float(info.get("fiftyTwoWeekLow"))

    if history is not None and not history.empty:
        closes = history["Close"].dropna()
        if week_high is None and not closes.empty:
            week_high = safe_float(closes.max())
        if week_low is None and not closes.empty:
            week_low = safe_float(closes.min())

    q_income = getattr(ticker, "quarterly_income_stmt", None)
    annual_income = getattr(ticker, "income_stmt", None)
    news = get_news_items(ticker, symbol)

    quarterly_results = build_quarterly_results(q_income, currency)
    revenue_growth_3y = cagr_from_df(annual_income, ["Total Revenue", "Operating Revenue", "Revenue"])
    profit_growth_3y = cagr_from_df(annual_income, ["Net Income", "Net Income Common Stockholders"])
    operating_margin = safe_float(info.get("operatingMargins"))
    operating_margin = round_or_none(operating_margin * 100 if operating_margin is not None and abs(operating_margin) <= 1 else operating_margin)
    net_margin = safe_float(info.get("profitMargins"))
    net_margin = round_or_none(net_margin * 100 if net_margin is not None and abs(net_margin) <= 1 else net_margin)

    analyst_targets = {}
    try:
        analyst_targets = ticker.analyst_price_targets or {}
    except Exception:
        analyst_targets = {}
    target_low = round_or_none(safe_float(analyst_targets.get("low")))
    target_high = round_or_none(safe_float(analyst_targets.get("high")))

    pos = sum(item["impact"] == "Positive" for item in news)
    neg = sum(item["impact"] == "Negative" for item in news)
    sentiment = "Positive" if pos > neg else "Negative" if neg > pos else "Neutral"

    score = compute_score(roe, debt_to_equity, pe)
    sector = normalize_space(info.get("sector")) or "N/A"
    industry_pe = safe_sector_pe(sector)
    fair_value = round((target_low + target_high) / 2, 2) if target_low is not None and target_high is not None else None
    margin_of_safety = percent_change(fair_value, current_price) if fair_value is not None and current_price is not None else None

    verdict = build_verdict(current_price, target_low, target_high, score, sentiment)

    return {
        "company": normalize_space(info.get("longName") or info.get("shortName") or strip_suffix(resolved_symbol)),
        "ticker": resolved_symbol,
        "sector": sector,
        "industry": normalize_space(info.get("industry")) or "N/A",
        "currentPrice": round_or_none(current_price),
        "marketCap": compact_currency(market_cap, currency),
        "weekHigh52": round_or_none(week_high),
        "weekLow52": round_or_none(week_low),
        "dayChange": round_or_none((current_price - previous_close) if current_price is not None and previous_close is not None else None),
        "dayChangePct": percent_change(current_price, previous_close),
        "overview": normalize_space(info.get("longBusinessSummary")) or "N/A",
        "priceHistory": price_history or [],
        "fundamentals": {
            "pe": round_or_none(pe),
            "industryPE": round_or_none(industry_pe),
            "pbRatio": round_or_none(safe_float(info.get("priceToBook"))),
            "evEbitda": round_or_none(safe_float(info.get("enterpriseToEbitda"))),
            "roe": roe,
            "roce": None,
            "debtToEquity": debt_to_equity,
            "revenueGrowth3Y": revenue_growth_3y,
            "profitGrowth3Y": profit_growth_3y,
            "operatingMargin": operating_margin,
            "netMargin": net_margin,
            "score": score,
            "summary": "Metrics are sourced directly from Yahoo Finance info and financial statements. Missing fields are returned as None or N/A.",
        },
        "quarterlyResults": quarterly_results,
        "valuation": {
            "intrinsicValueRange": f"{currency} {target_low} - {currency} {target_high}" if target_low is not None and target_high is not None else "N/A",
            "status": "Undervalued" if margin_of_safety is not None and margin_of_safety >= 10 else "Overvalued" if margin_of_safety is not None and margin_of_safety <= -10 else "Fairly Valued",
            "marginOfSafety": margin_of_safety,
            "analystConsensus": "Buy" if verdict["action"] == "BUY" else "Sell" if verdict["action"] == "SELL" else "Hold",
            "analystTargetLow": target_low,
            "analystTargetHigh": target_high,
            "peers": [],
            "score": score,
            "summary": "Valuation uses Yahoo Finance analyst targets when available. If targets are unavailable, fields remain None or N/A.",
        },
        "newsAndFilings": {
            "news": news,
            "filings": [],
            "sentiment": sentiment,
            "macroImpact": "N/A",
            "summary": "News is sourced from Yahoo Finance. Coverage may vary by ticker.",
        },
        "verdict": verdict,
    }


@app.post("/analyze")
async def analyze(request: Request):
    try:
        payload = await request.json()
    except Exception:
        return wrap_response({"error": "Invalid JSON body."})

    query = extract_query(payload)
    if not query:
        return wrap_response({"error": "Could not determine the stock name or ticker from the request."})

    cache_key = query.lower()
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    try:
        data = await asyncio.to_thread(get_stock_data, query)
    except Exception as exc:
        return wrap_response({"error": str(exc)})

    return cache_set(cache_key, wrap_response(data))


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)
