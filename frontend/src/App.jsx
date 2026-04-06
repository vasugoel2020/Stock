import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { getWatchlist, addToWatchlist, removeFromWatchlist, isInWatchlist } from './utils/watchlist'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8001'

// Verdict color schemes
const VERDICT_STYLES = {
  BUY: { 
    bg: 'from-emerald-500/20 to-emerald-600/20', 
    border: 'border-emerald-500/50',
    text: 'text-emerald-400',
    glow: 'shadow-[0_0_30px_rgba(16,185,129,0.3)]'
  },
  HOLD: { 
    bg: 'from-amber-500/20 to-amber-600/20', 
    border: 'border-amber-500/50',
    text: 'text-amber-400',
    glow: 'shadow-[0_0_30px_rgba(245,158,11,0.3)]'
  },
  SELL: { 
    bg: 'from-red-500/20 to-red-600/20', 
    border: 'border-red-500/50',
    text: 'text-red-400',
    glow: 'shadow-[0_0_30px_rgba(239,68,68,0.3)]'
  },
  AVOID: { 
    bg: 'from-rose-500/20 to-rose-600/20', 
    border: 'border-rose-500/50',
    text: 'text-rose-400',
    glow: 'shadow-[0_0_30px_rgba(244,63,94,0.3)]'
  }
}

const IMPACT_STYLES = {
  Positive: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  Negative: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
  Neutral: { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/30' }
}

function App() {
  const [input, setInput] = useState('')
  const [status, setStatus] = useState('idle') // idle, loading, done, error
  const [data, setData] = useState(null)
  const [watchlist, setWatchlist] = useState([])
  const [showWatchlist, setShowWatchlist] = useState(false)
  const [chartPeriod, setChartPeriod] = useState('1Y')

  useEffect(() => {
    setWatchlist(getWatchlist())
  }, [])

  const analyze = async (stockName) => {
    const query = (stockName || input).trim()
    if (!query || status === 'loading') return

    setStatus('loading')
    setData(null)
    setShowWatchlist(false)

    try {
      const response = await fetch(`${BACKEND_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stock: query,
          messages: [{
            role: 'user',
            content: `Analyze this stock: "${query}"`
          }]
        })
      })

      const json = await response.json()

      if (json.error) throw new Error(json.error)

      const text = json.content
        ?.filter(block => block.type === 'text')
        ?.map(block => block.text)
        ?.join('') || ''

      const match = text.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('No JSON found in response')

      const parsed = JSON.parse(match[0])
      setData(parsed)
      setStatus('done')
    } catch (err) {
      console.error(err)
      setStatus('error')
    }
  }

  const toggleWatchlist = () => {
    if (data) {
      const isWatched = isInWatchlist(data.ticker)
      if (isWatched) {
        removeFromWatchlist(data.ticker)
      } else {
        addToWatchlist(data)
      }
      setWatchlist(getWatchlist())
    }
  }

  const generateReasoningPoints = (data) => {
    const points = []
    
    if (data.fundamentals?.roe != null && data.fundamentals.roe >= 15) {
      points.push(`Strong return on equity (${data.fundamentals.roe}%) indicates efficient use of shareholder capital`)
    } else if (data.fundamentals?.roe != null && data.fundamentals.roe < 10) {
      points.push(`Below-average return on equity (${data.fundamentals.roe}%) suggests profitability challenges`)
    }

    if (data.fundamentals?.pe != null && data.fundamentals?.industryPE != null) {
      if (data.fundamentals.pe < data.fundamentals.industryPE) {
        points.push(`Trading below industry average P/E (${data.fundamentals.pe} vs ${data.fundamentals.industryPE}), potentially undervalued`)
      } else if (data.fundamentals.pe > data.fundamentals.industryPE * 1.2) {
        points.push(`Premium valuation with P/E of ${data.fundamentals.pe} vs industry ${data.fundamentals.industryPE}`)
      }
    }

    if (data.fundamentals?.debtToEquity != null) {
      if (data.fundamentals.debtToEquity < 0.5) {
        points.push(`Low debt-to-equity ratio (${data.fundamentals.debtToEquity}) reduces financial risk`)
      } else if (data.fundamentals.debtToEquity > 1.5) {
        points.push(`High debt levels (D/E: ${data.fundamentals.debtToEquity}) pose financial risk`)
      }
    }

    if (data.fundamentals?.revenueGrowth3Y != null && data.fundamentals.revenueGrowth3Y > 15) {
      points.push(`Consistent revenue growth of ${data.fundamentals.revenueGrowth3Y}% over 3 years`)
    }

    if (data.newsAndFilings?.sentiment) {
      const sentiment = data.newsAndFilings.sentiment
      if (sentiment === 'Positive') {
        points.push('Recent news sentiment is positive, indicating favorable market perception')
      } else if (sentiment === 'Negative') {
        points.push('Recent news sentiment is negative, suggesting caution')
      }
    }

    if (data.valuation?.status) {
      points.push(`Current valuation appears ${data.valuation.status.toLowerCase()}`)
    }

    return points.slice(0, 5)
  }

  return (
    <div className="min-h-screen bg-dark-bg text-white">
      {/* Header */}
      <nav className="border-b border-dark-border bg-dark-surface/50 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold">Stock Decision Engine</h1>
          </div>
          <button
            onClick={() => setShowWatchlist(!showWatchlist)}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-dark-card hover:bg-dark-card/70 transition-colors border border-dark-border"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            <span className="text-sm">Watchlist ({watchlist.length})</span>
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Hero Search or Watchlist View */}
        <AnimatePresence mode="wait">
          {showWatchlist ? (
            <motion.div
              key="watchlist"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-8"
            >
              <h2 className="text-2xl font-semibold mb-6">Your Watchlist</h2>
              {watchlist.length === 0 ? (
                <div className="glass-card p-12 text-center">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  <p className="text-gray-400">No stocks in your watchlist yet</p>
                  <p className="text-sm text-gray-500 mt-2">Search for a stock and save it to track later</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {watchlist.map((stock) => (
                    <motion.div
                      key={stock.ticker}
                      whileHover={{ scale: 1.02 }}
                      className="glass-card p-6 cursor-pointer hover:border-primary-500/50 transition-colors"
                      onClick={() => {
                        setInput(stock.ticker)
                        analyze(stock.ticker)
                      }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-lg">{stock.ticker}</h3>
                          <p className="text-sm text-gray-400 truncate">{stock.company}</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removeFromWatchlist(stock.ticker)
                            setWatchlist(getWatchlist())
                          }}
                          className="text-gray-500 hover:text-red-400 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                      {stock.currentPrice && (
                        <p className="text-2xl font-semibold text-primary-400">₹{stock.currentPrice}</p>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : status === 'idle' ? (
            <motion.div
              key="hero"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-20"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <h2 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
                  Should I buy this stock?
                </h2>
                <p className="text-xl text-gray-400 mb-12">
                  Get an investor-grade decision in seconds
                </p>
              </motion.div>

              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="max-w-2xl mx-auto"
              >
                <div className="relative">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && analyze()}
                    placeholder="Enter a stock (RELIANCE, TCS, AAPL...)"
                    className="w-full px-8 py-6 text-lg bg-dark-card border-2 border-dark-border rounded-2xl focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/20 transition-all placeholder-gray-500"
                    data-testid="stock-search-input"
                  />
                  <motion.button
                    onClick={() => analyze()}
                    disabled={!input.trim()}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-8 py-3 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl font-semibold hover:shadow-glow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid="analyze-button"
                  >
                    Analyze
                  </motion.button>
                </div>
              </motion.div>

              <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                {[
                  { icon: '🎯', title: 'Clear Decision', desc: 'BUY, HOLD, or SELL verdict' },
                  { icon: '💡', title: 'Simple Reasoning', desc: 'Understand why in plain English' },
                  { icon: '⚡', title: 'Live Data', desc: 'Real-time market insights' }
                ].map((feature, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="glass-card p-6 text-center"
                  >
                    <div className="text-4xl mb-3">{feature.icon}</div>
                    <h3 className="font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-gray-400">{feature.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Loading State */}
        {status === 'loading' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="w-16 h-16 border-4 border-primary-500/30 border-t-primary-500 rounded-full mx-auto mb-6"
            />
            <h3 className="text-xl font-semibold mb-2">Analyzing {input}...</h3>
            <p className="text-gray-400">Gathering market data, financials, and news</p>
          </motion.div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-8 border-red-500/50 bg-red-500/10 max-w-2xl mx-auto"
          >
            <div className="flex items-center space-x-3 mb-4">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-red-400">Analysis Failed</h3>
            </div>
            <p className="text-gray-300 mb-4">
              Could not analyze "{input}". Please try with the exact stock name or ticker symbol.
            </p>
            <button
              onClick={() => analyze()}
              className="px-6 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg border border-red-500/50 transition-colors"
            >
              Try Again
            </button>
          </motion.div>
        )}

        {/* Results */}
        {status === 'done' && data && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Stock Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <h2 className="text-3xl font-bold">{data.company}</h2>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleWatchlist}
                    className={`p-2 rounded-lg transition-colors ${
                      isInWatchlist(data.ticker)
                        ? 'bg-primary-500 text-white'
                        : 'bg-dark-card border border-dark-border hover:border-primary-500'
                    }`}
                    data-testid="watchlist-toggle"
                  >
                    <svg className="w-5 h-5" fill={isInWatchlist(data.ticker) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                  </motion.button>
                </div>
                <p className="text-gray-400">
                  {data.ticker} · {data.sector} · {data.industry}
                </p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold text-primary-400" data-testid="current-price">
                  ₹{data.currentPrice || '—'}
                </p>
                {data.dayChange != null && (
                  <p className={`text-lg font-semibold ${data.dayChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {data.dayChange >= 0 ? '+' : ''}{data.dayChange} ({data.dayChangePct >= 0 ? '+' : ''}{data.dayChangePct?.toFixed(2)}%)
                  </p>
                )}
              </div>
            </div>

            {/* DECISION PANEL - MOST IMPORTANT */}
            {data.verdict && (
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`glass-card p-8 border-2 ${VERDICT_STYLES[data.verdict.action]?.border} bg-gradient-to-br ${VERDICT_STYLES[data.verdict.action]?.bg} ${VERDICT_STYLES[data.verdict.action]?.glow}`}
                data-testid="decision-panel"
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Our verdict</p>
                    <h3 className={`text-6xl font-bold ${VERDICT_STYLES[data.verdict.action]?.text}`} data-testid="verdict-action">
                      {data.verdict.action}
                    </h3>
                    <p className="text-sm text-gray-400 mt-2">{data.verdict.positionSize}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400 mb-2">Confidence</p>
                    <div className="relative w-32 h-32">
                      <svg className="transform -rotate-90 w-32 h-32">
                        <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="none" className="text-gray-700" />
                        <circle 
                          cx="64" 
                          cy="64" 
                          r="56" 
                          stroke="currentColor" 
                          strokeWidth="8" 
                          fill="none" 
                          strokeDasharray={`${2 * Math.PI * 56}`}
                          strokeDashoffset={`${2 * Math.PI * 56 * (1 - (data.verdict.confidence || 0) / 100)}`}
                          className={VERDICT_STYLES[data.verdict.action]?.text}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-3xl font-bold" data-testid="confidence-score">{data.verdict.confidence}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-xs text-gray-400 mb-1">Target range</p>
                    <p className="text-lg font-semibold">
                      {data.verdict.targetLow && data.verdict.targetHigh
                        ? `₹${data.verdict.targetLow} - ₹${data.verdict.targetHigh}`
                        : '—'}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-xs text-gray-400 mb-1">Stop loss</p>
                    <p className="text-lg font-semibold">
                      {data.verdict.stopLoss ? `₹${data.verdict.stopLoss}` : '—'}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-xs text-gray-400 mb-1">Time horizon</p>
                    <p className="text-lg font-semibold">{data.verdict.targetHorizon || '—'}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-xs text-gray-400 mb-1">Entry strategy</p>
                    <p className="text-sm font-semibold">{data.verdict.entryStrategy || '—'}</p>
                  </div>
                </div>

                {data.verdict.exitTrigger && (
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-xs text-gray-400 mb-2">Exit trigger</p>
                    <p className="text-sm">{data.verdict.exitTrigger}</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* REASONING LAYER - CRITICAL FOR TRUST */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="glass-card p-8"
              data-testid="reasoning-section"
            >
              <h3 className="text-2xl font-semibold mb-6">Why this decision?</h3>
              <div className="space-y-4">
                {generateReasoningPoints(data).map((point, i) => (
                  <motion.div
                    key={i}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                    className="flex items-start space-x-3"
                  >
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-500/20 flex items-center justify-center mt-1">
                      <svg className="w-4 h-4 text-primary-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-gray-300 leading-relaxed">{point}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* SMART SUMMARY */}
            {data.overview && data.overview !== 'N/A' && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="glass-card p-8"
              >
                <h3 className="text-2xl font-semibold mb-4">Company overview</h3>
                <p className="text-gray-300 leading-relaxed">{data.overview}</p>
              </motion.div>
            )}

            {/* KEY METRICS GRID */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="glass-card p-8"
              data-testid="metrics-section"
            >
              <h3 className="text-2xl font-semibold mb-6">Key metrics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-dark-surface/50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 mb-1">Market cap</p>
                  <p className="text-lg font-semibold">{data.marketCap || '—'}</p>
                </div>
                <div className="bg-dark-surface/50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 mb-1">P/E ratio</p>
                  <p className="text-lg font-semibold">{data.fundamentals?.pe || '—'}</p>
                  {data.fundamentals?.industryPE && (
                    <p className="text-xs text-gray-500">Industry: {data.fundamentals.industryPE}</p>
                  )}
                </div>
                <div className="bg-dark-surface/50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 mb-1">ROE</p>
                  <p className="text-lg font-semibold">
                    {data.fundamentals?.roe != null ? `${data.fundamentals.roe}%` : '—'}
                  </p>
                </div>
                <div className="bg-dark-surface/50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 mb-1">Debt/Equity</p>
                  <p className="text-lg font-semibold">{data.fundamentals?.debtToEquity || '—'}</p>
                </div>
              </div>

              {/* 52-week range visualization */}
              {data.weekLow52 && data.weekHigh52 && data.currentPrice && (
                <div className="mt-6">
                  <p className="text-sm text-gray-400 mb-3">52-week range</p>
                  <div className="relative h-3 bg-dark-surface rounded-full overflow-hidden">
                    <div 
                      className="absolute h-full bg-gradient-to-r from-red-500 via-yellow-500 to-emerald-500"
                      style={{ width: '100%' }}
                    />
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full border-2 border-primary-500 shadow-lg"
                      style={{ 
                        left: `${((data.currentPrice - data.weekLow52) / (data.weekHigh52 - data.weekLow52)) * 100}%`,
                        transform: 'translate(-50%, -50%)'
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-gray-400">
                    <span>₹{data.weekLow52}</span>
                    <span>₹{data.weekHigh52}</span>
                  </div>
                </div>
              )}
            </motion.div>

            {/* PRICE TREND CHART */}
            {data.priceHistory && data.priceHistory.length > 0 && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="glass-card p-8"
                data-testid="chart-section"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-semibold">Price trend</h3>
                  <div className="flex space-x-2">
                    {['1M', '6M', '1Y'].map((period) => (
                      <button
                        key={period}
                        onClick={() => setChartPeriod(period)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          chartPeriod === period
                            ? 'bg-primary-500 text-white'
                            : 'bg-dark-surface text-gray-400 hover:text-white'
                        }`}
                      >
                        {period}
                      </button>
                    ))}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.priceHistory.map((price, i) => ({ value: price, index: i }))}>
                    <XAxis dataKey="index" hide />
                    <YAxis domain={['auto', 'auto']} hide />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1a2234',
                        border: '1px solid #2d3548',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                      formatter={(value) => [`₹${value}`, 'Price']}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#0ea5e9"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6, fill: '#0ea5e9' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </motion.div>
            )}

            {/* NEWS SECTION */}
            {data.newsAndFilings?.news && data.newsAndFilings.news.length > 0 && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="glass-card p-8"
                data-testid="news-section"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-semibold">Recent news</h3>
                  {data.newsAndFilings.sentiment && (
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${IMPACT_STYLES[data.newsAndFilings.sentiment]?.bg} ${IMPACT_STYLES[data.newsAndFilings.sentiment]?.text} border ${IMPACT_STYLES[data.newsAndFilings.sentiment]?.border}`}>
                      {data.newsAndFilings.sentiment} sentiment
                    </span>
                  )}
                </div>
                <div className="space-y-4">
                  {data.newsAndFilings.news.slice(0, 5).map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.6 + i * 0.1 }}
                      whileHover={{ x: 5 }}
                      className="bg-dark-surface/50 rounded-xl p-5 border border-dark-border hover:border-primary-500/50 transition-all cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-lg flex-1 mr-4">{item.headline}</h4>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${IMPACT_STYLES[item.impact]?.bg} ${IMPACT_STYLES[item.impact]?.text} border ${IMPACT_STYLES[item.impact]?.border} flex-shrink-0`}>
                          {item.impact}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mb-2">{item.summary}</p>
                      <p className="text-xs text-gray-500">{item.date}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Back to Search */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-center pt-8"
            >
              <button
                onClick={() => {
                  setStatus('idle')
                  setData(null)
                  setInput('')
                }}
                className="px-8 py-3 bg-dark-card hover:bg-dark-surface border border-dark-border rounded-xl transition-colors"
              >
                Analyze another stock
              </button>
            </motion.div>
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-dark-border mt-20 py-8 text-center text-sm text-gray-500">
        <p>For informational purposes only — not financial advice.</p>
        <p className="mt-2">Always do your own research before investing.</p>
      </footer>
    </div>
  )
}

export default App
