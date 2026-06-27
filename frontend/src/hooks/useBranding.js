import { useState, useEffect } from 'react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const STORAGE_KEY = 'aptiva_branding';

/**
 * useBranding - Returns branding config with localStorage caching.
 * On first render, returns cached value synchronously (no flicker).
 * In background, fetches latest from API and updates if changed.
 */
export const useBranding = () => {
  const [branding, setBranding] = useState(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API}/branding`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setBranding(data);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (_) { /* localStorage full or disabled */ }
      } catch (_) { /* network error - keep cached */ }
    })();
    return () => { cancelled = true; };
  }, []);

  return branding;
};
