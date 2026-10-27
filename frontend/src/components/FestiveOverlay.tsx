"use client";

import { useMemo } from "react";
import { useFestiveTheme } from "@/contexts/FestiveThemeContext";

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function FestiveOverlay() {
  const { theme, reducedMotion } = useFestiveTheme();

  const particles = useMemo(() => {
    if (!theme || reducedMotion) return [];
    const rand = mulberry32(hashSeed(theme.id));
    return Array.from({ length: theme.particleCount }, (_, index) => {
      const glyph = theme.particles[index % theme.particles.length];
      return {
        id: `${theme.id}-${index}`,
        glyph,
        left: rand() * 100,
        delay: rand() * 12,
        duration: 9 + rand() * 12,
        size: 0.85 + rand() * 0.9,
        drift: (rand() - 0.5) * 40,
        opacity: 0.35 + rand() * 0.45,
      };
    });
  }, [theme, reducedMotion]);

  if (!theme || reducedMotion || !particles.length) return null;

  return (
    <div className="festive-overlay" aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className="festive-particle"
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            fontSize: `${p.size}rem`,
            opacity: p.opacity,
            ["--festive-drift" as string]: `${p.drift}px`,
          }}
        >
          {p.glyph}
        </span>
      ))}
    </div>
  );
}
