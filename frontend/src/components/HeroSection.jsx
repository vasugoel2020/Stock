import { motion } from 'framer-motion';
import { FADE_IN, FADE_IN_VISIBLE, SCALE_IN, SCALE_IN_VISIBLE, FEATURE_CARDS } from '../constants';

export const HeroSection = ({ input, setInput, onAnalyze }) => {
  return (
    <motion.div
      key="hero"
      initial={FADE_IN}
      animate={FADE_IN_VISIBLE}
      exit={{ opacity: 0, y: -20 }}
      className="text-center py-20"
    >
      <motion.div initial={SCALE_IN} animate={SCALE_IN_VISIBLE} transition={{ delay: 0.1 }}>
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
            onKeyDown={(e) => e.key === 'Enter' && onAnalyze()}
            placeholder="Enter a stock (RELIANCE, TCS, AAPL...)"
            className="w-full px-8 py-6 text-lg bg-dark-card border-2 border-dark-border rounded-2xl focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/20 transition-all placeholder-gray-500"
            data-testid="stock-search-input"
          />
          <motion.button
            onClick={onAnalyze}
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
        {FEATURE_CARDS.map((feature, i) => (
          <motion.div
            key={feature.title}
            initial={FADE_IN}
            animate={FADE_IN_VISIBLE}
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
  );
};
