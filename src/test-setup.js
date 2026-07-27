import '@testing-library/jest-dom';

// Node's built-in `localStorage` (--experimental-webstorage, on by default
// in recent Node) is already defined on globalThis before vitest's jsdom
// environment sets up, and it's non-functional without a --localstorage-file
// path. vitest-environment-jsdom only assigns window properties onto
// globalThis for keys that aren't already present, so it leaves this broken
// native one in place instead of jsdom's own working Storage. Force it back
// to a working in-memory implementation for tests.
class MemoryStorage {
  #store = new Map();
  getItem(key) { return this.#store.has(key) ? this.#store.get(key) : null; }
  setItem(key, value) { this.#store.set(key, String(value)); }
  removeItem(key) { this.#store.delete(key); }
  clear() { this.#store.clear(); }
  key(index) { return Array.from(this.#store.keys())[index] ?? null; }
  get length() { return this.#store.size; }
}

Object.defineProperty(globalThis, 'localStorage', {
  value: new MemoryStorage(),
  configurable: true,
  writable: true,
});
