import { motion } from 'framer-motion';
import { FADE_IN, FADE_IN_VISIBLE } from '../constants';

export const ErrorState = ({ stockName, onRetry }) => {
  return (
    <motion.div
      initial={FADE_IN}
      animate={FADE_IN_VISIBLE}
      className="glass-card p-8 border-red-500/50 bg-red-500/10 max-w-2xl mx-auto"
    >
      <div className="flex items-center space-x-3 mb-4">
        <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-lg font-semibold text-red-400">Analysis Failed</h3>
      </div>
      <p className="text-gray-300 mb-4">
        Could not analyze "{stockName}". Please try with the exact stock name or ticker symbol.
      </p>
      <button
        onClick={onRetry}
        className="px-6 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg border border-red-500/50 transition-colors"
      >
        Try Again
      </button>
    </motion.div>
  );
};
