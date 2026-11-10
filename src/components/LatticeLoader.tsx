import { useEffect, useRef } from 'react';
import './LatticeLoader.css';

const orbit = [0, 1, 2, 7, null, 3, 6, 5, 4] as const;

const formatElapsed = (deciseconds: number) =>
  deciseconds < 600
    ? `${(deciseconds / 10).toFixed(1)}s`
    : `${Math.floor(deciseconds / 600)}m ${((deciseconds % 600) / 10).toFixed(1)}s`;

export default function LatticeLoader() {
  const timer = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const startedAt = performance.now();
    const interval = window.setInterval(() => {
      if (timer.current)
        timer.current.textContent = formatElapsed(
          Math.floor((performance.now() - startedAt) / 100),
        );
    }, 100);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <span className="lattice-loader" role="status" aria-label="Parsing with AI, in progress">
      <span className="lattice-loader__grid" aria-hidden="true">
        {orbit.map((step, index) => (
          <span
            key={index}
            className="lattice-loader__cell"
            data-hole={step === null ? '' : undefined}
            style={step === null ? undefined : { animationDelay: `${step * 108}ms` }}
          />
        ))}
      </span>
      <span aria-hidden="true">Parsing with AI</span>
      <span ref={timer} className="lattice-loader__timer" aria-hidden="true">
        0.0s
      </span>
    </span>
  );
}
