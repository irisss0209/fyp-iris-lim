import { useState, useCallback } from 'react';

export function usePasswordToggle(keys: string[] = ['password']) {
  const [visibility, setVisibility] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(keys.map(k => [k, false]))
  );

  const toggle = useCallback((key: string) => {
    setVisibility(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  }, []);

  const isVisible = (key: string) => !!visibility[key];

  return { isVisible, toggle };
}
