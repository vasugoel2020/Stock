/**
 * Generate human-readable reasoning points from stock data
 */
export const generateReasoningPoints = (data) => {
  const points = [];
  
  if (data.fundamentals?.roe != null && data.fundamentals.roe >= 15) {
    points.push(`Strong return on equity (${data.fundamentals.roe}%) indicates efficient use of shareholder capital`);
  } else if (data.fundamentals?.roe != null && data.fundamentals.roe < 10) {
    points.push(`Below-average return on equity (${data.fundamentals.roe}%) suggests profitability challenges`);
  }

  if (data.fundamentals?.pe != null && data.fundamentals?.industryPE != null) {
    if (data.fundamentals.pe < data.fundamentals.industryPE) {
      points.push(`Trading below industry average P/E (${data.fundamentals.pe} vs ${data.fundamentals.industryPE}), potentially undervalued`);
    } else if (data.fundamentals.pe > data.fundamentals.industryPE * 1.2) {
      points.push(`Premium valuation with P/E of ${data.fundamentals.pe} vs industry ${data.fundamentals.industryPE}`);
    }
  }

  if (data.fundamentals?.debtToEquity != null) {
    if (data.fundamentals.debtToEquity < 0.5) {
      points.push(`Low debt-to-equity ratio (${data.fundamentals.debtToEquity}) reduces financial risk`);
    } else if (data.fundamentals.debtToEquity > 1.5) {
      points.push(`High debt levels (D/E: ${data.fundamentals.debtToEquity}) pose financial risk`);
    }
  }

  if (data.fundamentals?.revenueGrowth3Y != null && data.fundamentals.revenueGrowth3Y > 15) {
    points.push(`Consistent revenue growth of ${data.fundamentals.revenueGrowth3Y}% over 3 years`);
  }

  if (data.newsAndFilings?.sentiment) {
    const sentiment = data.newsAndFilings.sentiment;
    if (sentiment === 'Positive') {
      points.push('Recent news sentiment is positive, indicating favorable market perception');
    } else if (sentiment === 'Negative') {
      points.push('Recent news sentiment is negative, suggesting caution');
    }
  }

  if (data.valuation?.status) {
    points.push(`Current valuation appears ${data.valuation.status.toLowerCase()}`);
  }

  return points.slice(0, 5);
};
