import { useState } from "react";

const SYSTEM = `You are a senior Indian equity research analyst with deep expertise in NSE/BSE markets. When given a stock name or ticker, use web search extensively to gather comprehensive, current data and return ONLY a valid JSON object — no markdown, no backticks, no explanation outside the JSON.

You MUST search for:
1. Current stock price, P/E, market cap, 52-week high/low, volume
2. Revenue growth (3Y CAGR), profit growth (3Y CAGR), ROE, ROCE, Debt-to-Equity, Free Cash Flow
3. Promoter holding %, FII/DII holding, pledging %
4. Last 2 quarters results (revenue, PAT, YoY growth)
5. Recent news affecting this stock (last 60 days) — at least 3 items
6. Recent BSE/NSE filings or announcements — at least 2 items
7. Analyst consensus and target prices from brokerages
8. Peer comparison (2-3 competitors, their P/E, ROE)

Return this EXACT JSON structure (all number fields must be actual numbers, use null if unavailable):
{
  "company": "Full company name",
  "ticker": "NSE ticker",
  "sector": "Sector name",
  "industry": "Sub-industry",
  "currentPrice": 0,
  "marketCap": "e.g. ₹14.2L Cr",
  "weekHigh52": 0,
  "weekLow52": 0,
  "dayChange": 0,
  "dayChangePct": 0,
  "overview": "3-4 sentence business overview covering what they do, revenue model, competitive position, and market leadership",
  "fundamentals": {
    "pe": 0,
    "industryPE": 0,
    "pbRatio": 0,
    "evEbitda": 0,
    "roe": 0,
    "roce": 0,
    "debtToEquity": 0,
    "revenueGrowth3Y": 0,
    "profitGrowth3Y": 0,
    "operatingMargin": 0,
    "netMargin": 0,
    "promoterHolding": 0,
    "fiiHolding": 0,
    "promoterPledging": 0,
    "score": 0,
    "summary": "4-5 sentence fundamental analysis covering strengths, concerns, and comparison to peers"
  },
  "quarterlyResults": [
    {"quarter": "Q3 FY25", "revenue": "e.g. ₹45,000 Cr", "pat": "e.g. ₹10,000 Cr", "revenueGrowthYoY": 0, "patGrowthYoY": 0},
    {"quarter": "Q2 FY25", "revenue": "e.g. ₹42,000 Cr", "pat": "e.g. ₹9,500 Cr", "revenueGrowthYoY": 0, "patGrowthYoY": 0}
  ],
  "valuation": {
    "intrinsicValueRange": "₹X – ₹Y",
    "status": "Overvalued|Fairly Valued|Undervalued",
    "marginOfSafety": 0,
    "analystConsensus": "Strong Buy|Buy|Hold|Sell",
    "analystTargetLow": 0,
    "analystTargetHigh": 0,
    "peers": [
      {"name": "Peer 1", "pe": 0, "roe": 0},
      {"name": "Peer 2", "pe": 0, "roe": 0}
    ],
    "score": 0,
    "summary": "4-5 sentence valuation analysis with DCF reasoning and peer comparison"
  },
  "newsAndFilings": {
    "news": [
      {"headline": "...", "date": "...", "impact": "Positive|Negative|Neutral", "summary": "2-3 sentence explanation of why this matters"},
      {"headline": "...", "date": "...", "impact": "Positive|Negative|Neutral", "summary": "..."},
      {"headline": "...", "date": "...", "impact": "Positive|Negative|Neutral", "summary": "..."}
    ],
    "filings": [
      {"type": "Quarterly Results|Board Meeting|Insider Trading|Dividend|etc", "date": "...", "summary": "..."},
      {"type": "...", "date": "...", "summary": "..."}
    ],
    "sentiment": "Positive|Negative|Neutral",
    "macroImpact": "2-3 sentences on how current macro environment (RBI policy, INR, oil prices, sector tailwinds) affects this stock",
    "summary": "2-3 sentence overall news impact summary"
  },
  "risks": [
    {"risk": "Risk title", "detail": "1-2 sentence explanation", "severity": "High|Medium|Low"},
    {"risk": "Risk title", "detail": "...", "severity": "High|Medium|Low"},
    {"risk": "Risk title", "detail": "...", "severity": "High|Medium|Low"}
  ],
  "catalysts": [
    {"catalyst": "Catalyst title", "detail": "1-2 sentence explanation", "timeline": "Near-term|Mid-term|Long-term"},
    {"catalyst": "Catalyst title", "detail": "...", "timeline": "..."}
  ],
  "verdict": {
    "action": "BUY|HOLD|SELL|AVOID",
    "confidence": 0,
    "reasoning": "4-5 sentence comprehensive verdict reasoning covering fundamentals, valuation, and timing",
    "targetLow": 0,
    "targetHigh": 0,
    "targetHorizon": "12-18 months",
    "stopLoss": 0,
    "positionSize": "Small (2-3%)|Medium (3-5%)|Large (5-7%)",
    "entryStrategy": "Lump sum|SIP over 2-3 months|Buy on dips",
    "exitTrigger": "2-3 sentence description of what would make you exit this position"
  }
}`;

const VERDICT_STYLES = {
  BUY:   { bg: "#EAF3DE", fg: "#27500A", border: "#639922", light: "#C0DD97" },
  HOLD:  { bg: "#FAEEDA", fg: "#633806", border: "#EF9F27", light: "#FAC775" },
  SELL:  { bg: "#FCEBEB", fg: "#501313", border: "#E24B4A", light: "#F7C1C1" },
  AVOID: { bg: "#FBEAF0", fg: "#4B1528", border: "#D4537E", light: "#F4C0D1" },
};

const IMPACT_STYLES = {
  Positive: { bg: "#EAF3DE", fg: "#3B6D11" },
  Negative: { bg: "#FCEBEB", fg: "#A32D2D" },
  Neutral:  { bg: "#F1EFE8", fg: "#5F5E5A" },
};

const SEVERITY_STYLES = {
  High:   { bg: "#FCEBEB", fg: "#A32D2D" },
  Medium: { bg: "#FAEEDA", fg: "#854F0B" },
  Low:    { bg: "#EAF3DE", fg: "#3B6D11" },
};

const TIMELINE_STYLES = {
  "Near-term": { bg: "#E6F1FB", fg: "#185FA5" },
  "Mid-term":  { bg: "#EEEDFE", fg: "#534AB7" },
  "Long-term": { bg: "#F1EFE8", fg: "#5F5E5A" },
};

function scoreColor(s) {
  if (!s) return "#888780";
  if (s >= 8) return "#3B6D11";
  if (s >= 5) return "#BA7517";
  return "#A32D2D";
}

function Badge({ text, bg, fg }) {
  return (
    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: bg, color: fg, fontWeight: 500, whiteSpace: "nowrap", display: "inline-block" }}>
      {text}
    </span>
  );
}

function MetricCard({ label, value, sub, highlight }) {
  return (
    <div style={{ background: "var(--color-background-secondary)", borderRadius: 8, padding: "10px 12px" }}>
      <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: "0 0 3px" }}>{label}</p>
      <p style={{ fontSize: 15, fontWeight: 500, margin: 0, color: highlight ? "#185FA5" : "var(--color-text-primary)" }}>
        {value ?? "—"}
      </p>
      {sub && <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: "2px 0 0" }}>{sub}</p>}
    </div>
  );
}

function ScoreBar({ score, label }) {
  const color = scoreColor(score);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 500, color }}>{score ?? "—"}/10</span>
      </div>
      <div style={{ height: 6, background: "var(--color-background-secondary)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${((score ?? 0) / 10) * 100}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

function PriceChange({ val, pct }) {
  if (val == null) return <span style={{ color: "var(--color-text-tertiary)", fontSize: 13 }}>—</span>;
  const up = val >= 0;
  const color = up ? "#3B6D11" : "#A32D2D";
  return (
    <span style={{ color, fontSize: 13, fontWeight: 500 }}>
      {up ? "+" : ""}{val} ({up ? "+" : ""}{pct?.toFixed(2)}%)
    </span>
  );
}

const TABS = ["overview", "fundamentals", "valuation", "news & filings", "verdict"];

export default function StockAnalyzer() {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("idle");
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("overview");
  const [history, setHistory] = useState([]);

  async function analyze(stockName) {
  const q = (stockName || input).trim();
  if (!q || status === "loading") return;

  setStatus("loading");
  setData(null);

  try {
    const res = await fetch("http://localhost:3001/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        system: SYSTEM,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{
          role: "user",
          content: `Analyze this Indian stock comprehensively: "${q}". Return ONLY JSON.`
        }]
      })
    });

    const json = await res.json();

    if (json.error) throw new Error(json.error);

    const text =
      json.content
        ?.filter(block => block.type === "text")
        ?.map(block => block.text)
        ?.join("") || "";

    const match = text.match(/\{[\s\S]*\}/);

    if (!match) {
      console.error("Raw response:", json);
      throw new Error("No JSON found");
    }

    const parsed = JSON.parse(match[0]);

    setData(parsed);
    setStatus("done");
    setTab("overview");

    if (!history.includes(q)) {
      setHistory(h => [q, ...h].slice(0, 6));
    }

  } catch (err) {
    console.error(err);
    setStatus("error");
  }
}

  
  const vc = data?.verdict ? (VERDICT_STYLES[data.verdict.action] || VERDICT_STYLES.HOLD) : null;

  return (
    <div style={{ fontFamily: "var(--font-sans)", padding: "0.75rem 0", minHeight: 400 }}>

      {/* Header */}
      <div style={{ marginBottom: "1.25rem" }}>
        <h2 style={{ fontSize: 18, fontWeight: 500, margin: "0 0 4px", color: "var(--color-text-primary)" }}>Stock Research Terminal</h2>
        <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", margin: 0 }}>
          Live web search · NSE/BSE · Fundamentals · Valuation · News · Buy/Hold/Sell verdict
        </p>
      </div>

      {/* Search */}
      <div style={{ display: "flex", gap: 8, marginBottom: history.length ? "0.5rem" : "1.5rem" }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && analyze()}
          placeholder="Enter stock name or NSE ticker — e.g. Reliance, INFY, Tata Motors..."
          style={{ flex: 1, padding: "9px 14px", fontSize: 14, border: "0.5px solid var(--color-border-secondary)", borderRadius: 8, background: "var(--color-background-primary)", color: "var(--color-text-primary)", outline: "none" }}
        />
        <button
          onClick={() => analyze()}
          disabled={status === "loading"}
          style={{ padding: "9px 20px", fontSize: 13, fontWeight: 500, border: "0.5px solid var(--color-border-secondary)", borderRadius: 8, background: "var(--color-background-primary)", color: "var(--color-text-primary)", cursor: status === "loading" ? "not-allowed" : "pointer", opacity: status === "loading" ? 0.6 : 1 }}
        >
          {status === "loading" ? "Analysing..." : "Analyse ↗"}
        </button>
      </div>

      {/* History chips */}
      {history.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: "1rem" }}>
          {history.map(h => (
            <button key={h} onClick={() => { setInput(h); analyze(h); }}
              style={{ fontSize: 11, padding: "3px 10px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 20, background: "var(--color-background-secondary)", color: "var(--color-text-secondary)", cursor: "pointer" }}>
              {h}
            </button>
          ))}
        </div>
      )}

      {/* Idle */}
      {status === "idle" && (
        <div style={{ textAlign: "center", padding: "2.5rem 0", color: "var(--color-text-tertiary)" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style={{ opacity: 0.3 }}>
              <polyline points="4,30 14,18 20,24 28,12 36,16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
          </div>
          <p style={{ fontSize: 14, margin: "0 0 6px", color: "var(--color-text-secondary)" }}>Enter any NSE/BSE stock for a complete analyst-grade research report</p>
          <p style={{ fontSize: 12, margin: 0 }}>Searches live financials · recent news · BSE filings · gives Buy/Hold/Sell verdict with target price</p>
        </div>
      )}

      {/* Loading */}
      {status === "loading" && (
        <div style={{ textAlign: "center", padding: "2.5rem 0" }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 14 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: "50%", background: "#378ADD",
                animation: `blink 1.2s ${i * 0.3}s ease-in-out infinite`
              }} />
            ))}
          </div>
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: "0 0 4px" }}>Searching financial data, news & filings...</p>
          <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", margin: 0 }}>Takes 20–40 seconds for a thorough analysis</p>
          <style>{`@keyframes blink{0%,100%{transform:scale(0.7);opacity:0.3}50%{transform:scale(1.3);opacity:1}}`}</style>
        </div>
      )}

      {/* Error */}
      {status === "error" && (
        <div style={{ padding: "14px 16px", background: "#FCEBEB", border: "0.5px solid #F7C1C1", borderRadius: 8, color: "#A32D2D", fontSize: 14 }}>
          Analysis failed. Try with the exact stock name or NSE ticker (e.g. "Reliance Industries" or "RELIANCE").
          <button onClick={() => analyze()} style={{ marginLeft: 12, fontSize: 12, color: "#A32D2D", textDecoration: "underline", background: "none", border: "none", cursor: "pointer" }}>Retry</button>
        </div>
      )}

      {/* Results */}
      {status === "done" && data && (
        <>
          {/* Company header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 500, margin: "0 0 2px" }}>{data.company}</h3>
              <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: 0 }}>
                {data.ticker} · {data.sector} · {data.industry}
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 20, fontWeight: 500, margin: 0, color: "#185FA5" }}>
                {data.currentPrice ? `₹${data.currentPrice}` : "—"}
              </p>
              <PriceChange val={data.dayChange} pct={data.dayChangePct} />
            </div>
          </div>

          {/* Quick stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 6, marginBottom: 10 }}>
            <MetricCard label="Market Cap" value={data.marketCap} />
            <MetricCard label="52W High" value={data.weekHigh52 ? `₹${data.weekHigh52}` : null} />
            <MetricCard label="52W Low" value={data.weekLow52 ? `₹${data.weekLow52}` : null} />
            <MetricCard label="P/E Ratio" value={data.fundamentals?.pe} sub={data.fundamentals?.industryPE ? `Industry: ${data.fundamentals.industryPE}` : null} />
          </div>

          {/* Verdict banner */}
          <div style={{ border: `1.5px solid ${vc.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 10, background: vc.bg, display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ background: vc.light, borderRadius: 6, padding: "4px 12px", flexShrink: 0 }}>
              <span style={{ fontSize: 18, fontWeight: 500, color: vc.fg }}>{data.verdict?.action}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12, color: vc.fg, margin: "0 0 1px", fontWeight: 500 }}>
                {data.verdict?.targetLow && data.verdict?.targetHigh
                  ? `Target ₹${data.verdict.targetLow}–₹${data.verdict.targetHigh} · ${data.verdict.targetHorizon}`
                  : "Target not available"}
                {data.verdict?.stopLoss ? `  ·  Stop-loss ₹${data.verdict.stopLoss}` : ""}
              </p>
              <p style={{ fontSize: 12, color: vc.fg, margin: 0, opacity: 0.75, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {data.verdict?.reasoning?.split('.')[0]}.
              </p>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <p style={{ fontSize: 10, color: vc.fg, margin: "0 0 1px", opacity: 0.7 }}>Confidence</p>
              <p style={{ fontSize: 20, fontWeight: 500, color: vc.fg, margin: 0 }}>{data.verdict?.confidence}%</p>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "0.5px solid var(--color-border-tertiary)", marginBottom: 12, gap: 0 }}>
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: "7px 12px", fontSize: 12, border: "none",
                borderBottom: tab === t ? "2px solid #185FA5" : "2px solid transparent",
                background: "transparent", color: tab === t ? "#185FA5" : "var(--color-text-secondary)",
                cursor: "pointer", fontWeight: tab === t ? 500 : 400, textTransform: "capitalize",
                transition: "color 0.15s"
              }}>{t}</button>
            ))}
          </div>

          {/* --- OVERVIEW --- */}
          {tab === "overview" && (
            <div>
              <p style={{ fontSize: 14, lineHeight: 1.75, margin: "0 0 14px", color: "var(--color-text-primary)" }}>{data.overview}</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div style={{ background: "var(--color-background-secondary)", borderRadius: 8, padding: "12px 14px" }}>
                  <p style={{ fontSize: 12, fontWeight: 500, margin: "0 0 8px", color: "var(--color-text-secondary)" }}>Catalysts</p>
                  {data.catalysts?.map((c, i) => (
                    <div key={i} style={{ marginBottom: 8, paddingLeft: 10, borderLeft: "2px solid #639922" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                        <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>{c.catalyst}</p>
                        {c.timeline && <Badge text={c.timeline} {...(TIMELINE_STYLES[c.timeline] || TIMELINE_STYLES["Mid-term"])} />}
                      </div>
                      <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: 0, lineHeight: 1.5 }}>{c.detail}</p>
                    </div>
                  ))}
                </div>
                <div style={{ background: "var(--color-background-secondary)", borderRadius: 8, padding: "12px 14px" }}>
                  <p style={{ fontSize: 12, fontWeight: 500, margin: "0 0 8px", color: "var(--color-text-secondary)" }}>Risks</p>
                  {data.risks?.map((r, i) => (
                    <div key={i} style={{ marginBottom: 8, paddingLeft: 10, borderLeft: "2px solid #E24B4A" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                        <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>{r.risk}</p>
                        {r.severity && <Badge text={r.severity} {...(SEVERITY_STYLES[r.severity] || SEVERITY_STYLES.Medium)} />}
                      </div>
                      <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: 0, lineHeight: 1.5 }}>{r.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* --- FUNDAMENTALS --- */}
          {tab === "fundamentals" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 6, marginBottom: 12 }}>
                <MetricCard label="P/E" value={data.fundamentals?.pe} sub={`Industry: ${data.fundamentals?.industryPE ?? "—"}`} />
                <MetricCard label="P/B Ratio" value={data.fundamentals?.pbRatio} />
                <MetricCard label="EV/EBITDA" value={data.fundamentals?.evEbitda} />
                <MetricCard label="ROE" value={data.fundamentals?.roe != null ? `${data.fundamentals.roe}%` : null} />
                <MetricCard label="ROCE" value={data.fundamentals?.roce != null ? `${data.fundamentals.roce}%` : null} />
                <MetricCard label="Debt / Equity" value={data.fundamentals?.debtToEquity} />
                <MetricCard label="Revenue Growth 3Y" value={data.fundamentals?.revenueGrowth3Y != null ? `${data.fundamentals.revenueGrowth3Y}%` : null} />
                <MetricCard label="Profit Growth 3Y" value={data.fundamentals?.profitGrowth3Y != null ? `${data.fundamentals.profitGrowth3Y}%` : null} />
                <MetricCard label="Operating Margin" value={data.fundamentals?.operatingMargin != null ? `${data.fundamentals.operatingMargin}%` : null} />
                <MetricCard label="Net Margin" value={data.fundamentals?.netMargin != null ? `${data.fundamentals.netMargin}%` : null} />
                <MetricCard label="Promoter Holding" value={data.fundamentals?.promoterHolding != null ? `${data.fundamentals.promoterHolding}%` : null}
                  sub={data.fundamentals?.promoterPledging != null ? `Pledged: ${data.fundamentals.promoterPledging}%` : null} />
                <MetricCard label="FII Holding" value={data.fundamentals?.fiiHolding != null ? `${data.fundamentals.fiiHolding}%` : null} />
              </div>
              <ScoreBar score={data.fundamentals?.score} label="Fundamental strength score" />
              <p style={{ fontSize: 14, lineHeight: 1.75, margin: "12px 0 0", color: "var(--color-text-secondary)" }}>{data.fundamentals?.summary}</p>

              {data.quarterlyResults?.length > 0 && (
                <>
                  <p style={{ fontSize: 13, fontWeight: 500, margin: "16px 0 8px" }}>Recent quarterly results</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {data.quarterlyResults.map((q, i) => (
                      <div key={i} style={{ background: "var(--color-background-secondary)", borderRadius: 8, padding: "10px 12px" }}>
                        <p style={{ fontSize: 12, fontWeight: 500, margin: "0 0 6px", color: "var(--color-text-secondary)" }}>{q.quarter}</p>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                          <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Revenue</span>
                          <span style={{ fontSize: 13, fontWeight: 500 }}>{q.revenue}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                          <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>PAT</span>
                          <span style={{ fontSize: 13, fontWeight: 500 }}>{q.pat}</span>
                        </div>
                        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                          {q.revenueGrowthYoY != null && (
                            <Badge text={`Rev ${q.revenueGrowthYoY >= 0 ? "+" : ""}${q.revenueGrowthYoY}% YoY`}
                              bg={q.revenueGrowthYoY >= 0 ? "#EAF3DE" : "#FCEBEB"}
                              fg={q.revenueGrowthYoY >= 0 ? "#3B6D11" : "#A32D2D"} />
                          )}
                          {q.patGrowthYoY != null && (
                            <Badge text={`PAT ${q.patGrowthYoY >= 0 ? "+" : ""}${q.patGrowthYoY}% YoY`}
                              bg={q.patGrowthYoY >= 0 ? "#EAF3DE" : "#FCEBEB"}
                              fg={q.patGrowthYoY >= 0 ? "#3B6D11" : "#A32D2D"} />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* --- VALUATION --- */}
          {tab === "valuation" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 6, marginBottom: 12 }}>
                <MetricCard label="Intrinsic Value Range" value={data.valuation?.intrinsicValueRange} highlight />
                <MetricCard label="Valuation Status" value={data.valuation?.status} />
                <MetricCard label="Margin of Safety" value={data.valuation?.marginOfSafety != null ? `${data.valuation.marginOfSafety}%` : null} />
                <MetricCard label="Analyst Consensus" value={data.valuation?.analystConsensus} />
                <MetricCard label="Analyst Target Low" value={data.valuation?.analystTargetLow ? `₹${data.valuation.analystTargetLow}` : null} />
                <MetricCard label="Analyst Target High" value={data.valuation?.analystTargetHigh ? `₹${data.valuation.analystTargetHigh}` : null} />
              </div>
              <ScoreBar score={data.valuation?.score} label="Valuation attractiveness score" />
              <p style={{ fontSize: 14, lineHeight: 1.75, margin: "12px 0 14px", color: "var(--color-text-secondary)" }}>{data.valuation?.summary}</p>
              {data.valuation?.peers?.length > 0 && (
                <>
                  <p style={{ fontSize: 13, fontWeight: 500, margin: "0 0 8px" }}>Peer comparison</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ flex: 1, background: "#E6F1FB", borderRadius: 8, padding: "10px 12px", border: "1.5px solid #B5D4F4" }}>
                      <p style={{ fontSize: 12, color: "#0C447C", margin: "0 0 4px", fontWeight: 500 }}>{data.company}</p>
                      <p style={{ fontSize: 13, margin: "0 0 2px", color: "#0C447C" }}>P/E: {data.fundamentals?.pe ?? "—"}</p>
                      <p style={{ fontSize: 13, margin: 0, color: "#0C447C" }}>ROE: {data.fundamentals?.roe != null ? `${data.fundamentals.roe}%` : "—"}</p>
                    </div>
                    {data.valuation.peers.map((p, i) => (
                      <div key={i} style={{ flex: 1, background: "var(--color-background-secondary)", borderRadius: 8, padding: "10px 12px" }}>
                        <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 4px", fontWeight: 500 }}>{p.name}</p>
                        <p style={{ fontSize: 13, margin: "0 0 2px" }}>P/E: {p.pe ?? "—"}</p>
                        <p style={{ fontSize: 13, margin: 0 }}>ROE: {p.roe != null ? `${p.roe}%` : "—"}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* --- NEWS & FILINGS --- */}
          {tab === "news & filings" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>Recent news</p>
                {data.newsAndFilings?.sentiment && (
                  <Badge text={`Overall sentiment: ${data.newsAndFilings.sentiment}`}
                    {...(IMPACT_STYLES[data.newsAndFilings.sentiment] || IMPACT_STYLES.Neutral)} />
                )}
              </div>
              {data.newsAndFilings?.news?.map((n, i) => {
                const ic = IMPACT_STYLES[n.impact] || IMPACT_STYLES.Neutral;
                return (
                  <div key={i} style={{ marginBottom: 8, padding: "10px 12px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8, borderLeft: `3px solid ${ic.fg}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 3 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, margin: 0, flex: 1, lineHeight: 1.4 }}>{n.headline}</p>
                      <div style={{ display: "flex", gap: 4, flexShrink: 0, alignItems: "flex-start" }}>
                        {n.date && <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{n.date}</span>}
                        <Badge text={n.impact} bg={ic.bg} fg={ic.fg} />
                      </div>
                    </div>
                    <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: 0, lineHeight: 1.5 }}>{n.summary}</p>
                  </div>
                );
              })}

              {data.newsAndFilings?.macroImpact && (
                <div style={{ margin: "12px 0", padding: "10px 12px", background: "#EEEDFE", borderRadius: 8, border: "0.5px solid #AFA9EC" }}>
                  <p style={{ fontSize: 12, fontWeight: 500, margin: "0 0 3px", color: "#3C3489" }}>Macro environment impact</p>
                  <p style={{ fontSize: 12, color: "#534AB7", margin: 0, lineHeight: 1.6 }}>{data.newsAndFilings.macroImpact}</p>
                </div>
              )}

              {data.newsAndFilings?.filings?.length > 0 && (
                <>
                  <p style={{ fontSize: 13, fontWeight: 500, margin: "14px 0 8px" }}>BSE/NSE filings</p>
                  {data.newsAndFilings.filings.map((f, i) => (
                    <div key={i} style={{ marginBottom: 6, padding: "10px 12px", background: "var(--color-background-secondary)", borderRadius: 8 }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 3 }}>
                        <Badge text={f.type} bg="#E6F1FB" fg="#185FA5" />
                        {f.date && <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{f.date}</span>}
                      </div>
                      <p style={{ fontSize: 12, margin: 0, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>{f.summary}</p>
                    </div>
                  ))}
                </>
              )}
              <p style={{ fontSize: 13, margin: "12px 0 0", lineHeight: 1.7, color: "var(--color-text-secondary)" }}>{data.newsAndFilings?.summary}</p>
            </div>
          )}

          {/* --- VERDICT --- */}
          {tab === "verdict" && (
            <div>
              <div style={{ border: `1.5px solid ${vc.border}`, borderRadius: 10, padding: "16px", background: vc.bg, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <span style={{ fontSize: 26, fontWeight: 500, color: vc.fg }}>{data.verdict?.action}</span>
                    <p style={{ fontSize: 12, color: vc.fg, margin: "2px 0 0", opacity: 0.8 }}>{data.verdict?.positionSize}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ margin: 0, fontSize: 11, color: vc.fg, opacity: 0.7 }}>Confidence</p>
                    <p style={{ margin: 0, fontSize: 26, fontWeight: 500, color: vc.fg }}>{data.verdict?.confidence}%</p>
                  </div>
                </div>
                <p style={{ fontSize: 14, color: vc.fg, margin: "0 0 12px", lineHeight: 1.75 }}>{data.verdict?.reasoning}</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 6, marginBottom: 10 }}>
                  {[
                    { label: "Target low", value: data.verdict?.targetLow ? `₹${data.verdict.targetLow}` : "—" },
                    { label: "Target high", value: data.verdict?.targetHigh ? `₹${data.verdict.targetHigh}` : "—" },
                    { label: "Horizon", value: data.verdict?.targetHorizon || "—" },
                    { label: "Stop-loss", value: data.verdict?.stopLoss ? `₹${data.verdict.stopLoss}` : "—" },
                  ].map(item => (
                    <div key={item.label} style={{ background: "rgba(255,255,255,0.45)", borderRadius: 6, padding: "8px 10px" }}>
                      <p style={{ fontSize: 11, color: vc.fg, opacity: 0.7, margin: "0 0 2px" }}>{item.label}</p>
                      <p style={{ fontSize: 14, fontWeight: 500, color: vc.fg, margin: 0 }}>{item.value}</p>
                    </div>
                  ))}
                </div>
                {data.verdict?.entryStrategy && (
                  <div style={{ background: "rgba(255,255,255,0.3)", borderRadius: 6, padding: "8px 10px", marginBottom: 8 }}>
                    <p style={{ fontSize: 11, color: vc.fg, opacity: 0.7, margin: "0 0 2px" }}>Entry strategy</p>
                    <p style={{ fontSize: 13, color: vc.fg, margin: 0 }}>{data.verdict.entryStrategy}</p>
                  </div>
                )}
                {data.verdict?.exitTrigger && (
                  <div style={{ background: "rgba(255,255,255,0.3)", borderRadius: 6, padding: "8px 10px" }}>
                    <p style={{ fontSize: 11, color: vc.fg, opacity: 0.7, margin: "0 0 2px" }}>Exit trigger</p>
                    <p style={{ fontSize: 13, color: vc.fg, margin: 0, lineHeight: 1.5 }}>{data.verdict.exitTrigger}</p>
                  </div>
                )}
              </div>
              <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", lineHeight: 1.6, margin: 0 }}>
                For informational purposes only — not financial advice. Always verify compliance with Deloitte's personal independence policy before investing in individual stocks. Past performance does not guarantee future results.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
