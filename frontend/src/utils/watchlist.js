// Watchlist utility functions using localStorage

const WATCHLIST_KEY = 'stock_watchlist';

export const getWatchlist = () => {
  try {
    const data = localStorage.getItem(WATCHLIST_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading watchlist:', error);
    return [];
  }
};

export const addToWatchlist = (stock) => {
  try {
    const watchlist = getWatchlist();
    const exists = watchlist.find(item => item.ticker === stock.ticker);
    
    if (!exists) {
      const newWatchlist = [...watchlist, {
        ticker: stock.ticker,
        company: stock.company,
        currentPrice: stock.currentPrice,
        addedAt: new Date().toISOString()
      }];
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(newWatchlist));
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error adding to watchlist:', error);
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
    console.error('Error removing from watchlist:', error);
    return false;
  }
};

export const isInWatchlist = (ticker) => {
  const watchlist = getWatchlist();
  return watchlist.some(item => item.ticker === ticker);
};
