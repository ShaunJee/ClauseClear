"use client";

import React, { useEffect, useRef, useState } from "react";

/** Animates 0 -> value (ease-out). Respects prefers-reduced-motion. */
export function useCountUp(value: number, duration = 750, alwaysStartFromZero = true) {
  const [display, setDisplay] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || duration <= 0) {
      from.current = value;
      setDisplay(value);
      return;
    }
    const start = performance.now();
    const origin = alwaysStartFromZero ? 0 : from.current;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = origin + (value - origin) * eased;
      from.current = v;
      setDisplay(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, alwaysStartFromZero]);

  return display;
}

export function CountUp({
  value,
  format = (n: number) => String(Math.round(n)),
  duration = 900,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
}) {
  const v = useCountUp(value, duration);
  return <span className="tabular-nums">{format(v)}</span>;
}
