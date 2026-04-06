import { useState, useEffect, useCallback } from 'react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8001';

export const useStockAnalysis = () => {
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, done, error
  const [data, setData] = useState(null);

  const analyze = useCallback(async (stockName) => {
    const query = (stockName || input).trim();
    if (!query || status === 'loading') return;

    setStatus('loading');
    setData(null);

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
      });

      const json = await response.json();

      if (json.error) throw new Error(json.error);

      const text = json.content
        ?.filter(block => block.type === 'text')
        ?.map(block => block.text)
        ?.join('') || '';

      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('No JSON found in response');

      const parsed = JSON.parse(match[0]);
      setData(parsed);
      setStatus('done');
    } catch (err) {
      setStatus('error');
    }
  }, [input, status]);

  const reset = useCallback(() => {
    setStatus('idle');
    setData(null);
    setInput('');
  }, []);

  return {
    input,
    setInput,
    status,
    data,
    analyze,
    reset
  };
};
