import React, { useState, useMemo, useCallback, lazy, Suspense, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

// Lazy-load heavy sim component for perf
const YieldSimulator = lazy(() => import('./YieldSimulator'));

type FarmData = {
  yield: number; // tons/hectare
  risk: number; // % blight risk
  water: number; // liters saved
  suggestions: string[];
};

const useFarmData = (initialYield: number = 12) => {
  const [data, setData] = useState<FarmData>({
    yield: initialYield,
    risk: 25,
    water: 0,
    suggestions: ['Monitor humidity east plot.'],
  });

  // Memoized prediction fn (simulates ARL)
  const predictYield = useCallback((adjustment: number) => {
    const newYield = data.yield + adjustment;
    const newRisk = Math.max(0, data.risk - Math.abs(adjustment) * 2);
    const newWater = data.water + (adjustment * 50); // Mock savings
    const hunches = [
      'Pivot irrigation 15° east.',
      'Dose nutrients +10% N.',
      'Harvest early if risk >20%.',
    ];
    return { yield: newYield, risk: newRisk, water: newWater, suggestions: hunches.slice(0, 2) };
  }, [data]);

  // Offline persistence with IndexedDB
  useEffect(() => {
    if ('indexedDB' in window) {
      const dbRequest = indexedDB.open('SymbiontDB', 1);
      dbRequest.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        db.createObjectStore('farmData', { keyPath: 'id' });
      };
      dbRequest.onsuccess = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        const tx = db.transaction('farmData', 'readwrite');
        tx.objectStore('farmData').put({ ...data, id: 1 });
      };
    }
  }, [data]);

  return { data, update: setData, predict: predictYield };
};

const App: React.FC = () => {
  const { data, update, predict } = useFarmData();
  const [darkMode, setDarkMode] = useState(false);
  const [adjustment, setAdjustment] = useState(0);

  // Nigeria time/date
  const naijaTime = new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' });

  // Memoized dashboard for re-render optimization
  const dashboard = useMemo(() => (
    <div className="dashboard" role="region" aria-label="Farm Metrics">
      <div className="metric">
        <h2>Yield</h2>
        <p aria-live="polite">{data.yield.toFixed(1)} tons/ha</p>
      </div>
      <div className="metric">
        <h2>Risk</h2>
        <p aria-live="polite">{data.risk.toFixed(1)}% Blight</p>
      </div>
      <div className="metric">
        <h2>Water Saved</h2>
        <p>{Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(data.water * 0.1)}</p>
      </div>
      <div className="metric">
        <h2>AI Hunches</h2>
        <ul>{data.suggestions.map((s, i) => <li key={i} className="suggestion">{s}</li>)}</ul>
      </div>
    </div>
  ), [data]);

  const handleEvolve = useCallback(() => {
    const newData = predict(adjustment);
    update(newData);
    setAdjustment(0); // Reset
  }, [predict, update, adjustment]);

  // Dark mode effect
  useEffect(() => {
    document.body.classList.toggle('dark', darkMode);
  }, [darkMode]);

  return (
    <div>
      <button className="toggle" onClick={() => setDarkMode(!darkMode)} aria-label="Toggle Dark Mode">
        {darkMode ? '☀️' : '🌙'}
      </button>
      <h1>Symbiont Dashboard 🇳🇬</h1>
      <p>Empowering farmers since 2025. Local time: {naijaTime}</p>
      {dashboard}
      <div>
        <label htmlFor="adjustment">AI Adjustment (+/- tons):</label>
        <input
          id="adjustment"
          type="number"
          value={adjustment}
          onChange={(e) => setAdjustment(Number(e.target.value))}
          aria-describedby="evolve-desc"
          style={{ margin: '0 10px', padding: '8px' }}
        />
        <button onClick={handleEvolve} disabled={adjustment === 0}>
          Co-Evolve Yield
        </button>
        <p id="evolve-desc">Apply neural hunch to optimize farm.</p>
      </div>
      <Suspense fallback={<div>Loading Simulator...</div>}>
        <YieldSimulator yield={data.yield} />
      </Suspense>
    </div>
  );
};

const container = document.getElementById('app')!;
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}