/** Small publish/subscribe hub so game systems do not need to know about each other. */
export class EventBus {
  #handlers = new Map();
  on(event, fn) {
    if (!this.#handlers.has(event)) this.#handlers.set(event, new Set());
    this.#handlers.get(event).add(fn);
    return () => this.#handlers.get(event).delete(fn);
  }
  emit(event, ...args) {
    (this.#handlers.get(event) || []).forEach(fn => fn(...args));
  }
}
