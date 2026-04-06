import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStockAnalysis } from './hooks/useStockAnalysis';
import { useWatchlist } from './hooks/useWatchlist';
import { HeroSection } from './components/HeroSection';
import { LoadingState } from './components/LoadingState';
import { ErrorState } from './components/ErrorState';
import { StockResults } from './components/StockResults';
import { WatchlistView } from './components/WatchlistView';

function App() {
  const [showWatchlist, setShowWatchlist] = useState(false);
  const { input, setInput, status, data, analyze, reset } = useStockAnalysis();
  const { watchlist, toggleWatchlist, removeStock, isWatched } = useWatchlist();

  const handleAnalyze = () => {
    setShowWatchlist(false);
    analyze();
  };

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
        <AnimatePresence mode="wait">
          {showWatchlist && (
            <WatchlistView
              key="watchlist"
              watchlist={watchlist}
              onRemove={removeStock}
              onSelect={(ticker) => {
                setInput(ticker);
                analyze(ticker);
              }}
            />
          )}
          
          {!showWatchlist && status === 'idle' && (
            <HeroSection
              key="hero"
              input={input}
              setInput={setInput}
              onAnalyze={handleAnalyze}
            />
          )}
        </AnimatePresence>

        {status === 'loading' && <LoadingState stockName={input} />}
        {status === 'error' && <ErrorState stockName={input} onRetry={handleAnalyze} />}

        {status === 'done' && data && (
          <StockResults
            data={data}
            isWatched={isWatched(data.ticker)}
            onToggleWatchlist={() => toggleWatchlist(data)}
            onReset={reset}
          />
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-dark-border mt-20 py-8 text-center text-sm text-gray-500">
        <p>For informational purposes only — not financial advice.</p>
        <p className="mt-2">Always do your own research before investing.</p>
      </footer>
    </div>
  );
}

export default App;
