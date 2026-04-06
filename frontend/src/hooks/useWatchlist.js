import { useState, useEffect, useCallback } from 'react';
import { getWatchlist, addToWatchlist, removeFromWatchlist, isInWatchlist } from '../utils/watchlist';

export const useWatchlist = () => {
  const [watchlist, setWatchlist] = useState([]);

  const refreshWatchlist = useCallback(() => {
    setWatchlist(getWatchlist());
  }, []);

  useEffect(() => {
    refreshWatchlist();
  }, [refreshWatchlist]);

  const toggleWatchlist = useCallback((stock) => {
    if (!stock) return;
    
    const isWatched = isInWatchlist(stock.ticker);
    if (isWatched) {
      removeFromWatchlist(stock.ticker);
    } else {
      addToWatchlist(stock);
    }
    refreshWatchlist();
  }, [refreshWatchlist]);

  const removeStock = useCallback((ticker) => {
    removeFromWatchlist(ticker);
    refreshWatchlist();
  }, [refreshWatchlist]);

  const isWatched = useCallback((ticker) => {
    return isInWatchlist(ticker);
  }, []);

  return {
    watchlist,
    toggleWatchlist,
    removeStock,
    isWatched,
    refreshWatchlist
  };
};
