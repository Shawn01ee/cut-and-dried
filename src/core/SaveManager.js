/** Persists one JSON document. Storage can be unavailable, so every access is guarded. */
export class SaveManager {
  constructor(key) { this.key = key; }
  load() { try { return JSON.parse(localStorage.getItem(this.key)); } catch { return null; } }
  save(data) { try { localStorage.setItem(this.key, JSON.stringify(data)); } catch { /* unavailable */ } }
  clear() { try { localStorage.removeItem(this.key); } catch { /* unavailable */ } }
  has() { return !!this.load(); }
}
