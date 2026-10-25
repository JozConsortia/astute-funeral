import { useState } from 'react';

// Visitor-chosen text size. All CSS sizes are in rem, so changing the root
// font size scales the whole site.
export type TextSize = 'normal' | 'large' | 'larger';

const SCALE: Record<TextSize, string> = { normal: '100%', large: '112.5%', larger: '125%' };
const KEY = 'astute-text-size';

function stored(): TextSize {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'large' || value === 'larger' ? value : 'normal';
  } catch {
    return 'normal'; // storage blocked (private mode etc.)
  }
}

function apply(size: TextSize) {
  document.documentElement.style.fontSize = SCALE[size];
}

/** Call once before the first render so the page doesn't jump. */
export function applyStoredTextSize() {
  apply(stored());
}

export function useTextSize() {
  const [size, setSize] = useState<TextSize>(stored);
  const choose = (next: TextSize) => {
    setSize(next);
    apply(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // ignore - the choice still applies for this visit
    }
  };
  return [size, choose] as const;
}
