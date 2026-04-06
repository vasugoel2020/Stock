import { motion } from 'framer-motion';

export const LoadingState = ({ stockName }) => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        className="w-16 h-16 border-4 border-primary-500/30 border-t-primary-500 rounded-full mx-auto mb-6"
      />
      <h3 className="text-xl font-semibold mb-2">Analyzing {stockName}...</h3>
      <p className="text-gray-400">Gathering market data, financials, and news</p>
    </motion.div>
  );
};
