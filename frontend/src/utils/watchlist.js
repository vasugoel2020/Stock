/**
 * Watchlist utility functions using localStorage
 * Note: For production, consider moving to backend storage with authentication
 * or implementing encryption for sensitive data
 */

const WATCHLIST_KEY = 'stock_watchlist';

// Simple validation to prevent XSS
const sanitizeString = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/<script[^>]*>.*?<\/script>/gi, '').trim();
};

export const getWatchlist = () => {
  try {
    const data = localStorage.getItem(WATCHLIST_KEY);
    if (!data) return [];
    
    const parsed = JSON.parse(data);
    // Validate structure
    if (!Array.isArray(parsed)) return [];
    
    return parsed.map(item => ({
      ticker: sanitizeString(item.ticker),
      company: sanitizeString(item.company),
      currentPrice: typeof item.currentPrice === 'number' ? item.currentPrice : null,
      addedAt: item.addedAt || new Date().toISOString()
    }));
  } catch (error) {
    return [];
  }
};

export const addToWatchlist = (stock) => {
  try {
    if (!stock || !stock.ticker) return false;
    
    const watchlist = getWatchlist();
    const exists = watchlist.find(item => item.ticker === stock.ticker);
    
    if (!exists) {
      const newItem = {
        ticker: sanitizeString(stock.ticker),
        company: sanitizeString(stock.company),
        currentPrice: stock.currentPrice,
        addedAt: new Date().toISOString()
      };
      const newWatchlist = [...watchlist, newItem];
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(newWatchlist));
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
};

export const removeFromWatchlist = (ticker) => {
  try {
    const watchlist = getWatchlist();
    const newWatchlist = watchlist.filter(item => item.ticker !== ticker);
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(newWatchlist));
    return true;
  } catch (error) {
    return false;
  }
};

export const isInWatchlist = (ticker) => {
  const watchlist = getWatchlist();
  return watchlist.some(item => item.ticker === ticker);
};
