// Constants for animation configs
export const FADE_IN = { opacity: 0, y: 20 };
export const FADE_IN_VISIBLE = { opacity: 1, y: 0 };
export const SCALE_IN = { scale: 0.9, opacity: 0 };
export const SCALE_IN_VISIBLE = { scale: 1, opacity: 1 };
export const SLIDE_IN_LEFT = { x: -20, opacity: 0 };
export const SLIDE_IN_VISIBLE = { x: 0, opacity: 1 };

export const VERDICT_STYLES = {
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
};

export const IMPACT_STYLES = {
  Positive: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  Negative: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
  Neutral: { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/30' }
};

export const FEATURE_CARDS = [
  { icon: '🎯', title: 'Clear Decision', desc: 'BUY, HOLD, or SELL verdict' },
  { icon: '💡', title: 'Simple Reasoning', desc: 'Understand why in plain English' },
  { icon: '⚡', title: 'Live Data', desc: 'Real-time market insights' }
];
