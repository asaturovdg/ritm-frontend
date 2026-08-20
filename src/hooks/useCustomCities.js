import { useState } from 'react';
import { CITIES } from '../data/filters.js';

const STORAGE_KEY = 'user_custom_cities';

const titleCase = (value) =>
  value.trim()
    .toLowerCase()
    .replace(/(^|[\s-])([а-яёa-z]+)/g, (_, sep, word) =>
      sep + (sep === '-' && word.length <= 2 ? word : word.charAt(0).toUpperCase() + word.slice(1))
    );

export function useCustomCities() {
  const [customCities, setCustomCities] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  const addCustomCity = (rawCity) => {
    const city = titleCase(rawCity);
    if (!city || customCities.includes(city) || CITIES.includes(city)) return null;
    const updated = [...customCities, city];
    setCustomCities(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return city;
  };

  const removeCustomCity = (city) => {
    const updated = customCities.filter((c) => c !== city);
    setCustomCities(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const mergeCustomCities = (cities) => {
    setCustomCities((prev) => {
      const merged = [...new Set([...prev, ...cities])];
      if (merged.length === prev.length) return prev;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return merged;
    });
  };

  return { customCities, addCustomCity, removeCustomCity, mergeCustomCities };
}
