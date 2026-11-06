export type Phase = 'idle' | 'loading' | 'refreshing' | 'success' | 'error';
export type LoadState<T> = { items: T[]; phase: Phase; stale: boolean; error: string | null; intent: number };
export type Request<T, Q> = (query: Q, signal: AbortSignal) => Promise<T[]>;

/** Abort saves work; monotonically increasing intent also rejects late replies
 * from transports that ignore abort. Kept independent of DOM/framework state. */
export function createLatestLoader<T, Q>(request: Request<T, Q>) {
  let intent = 0;
  let controller: AbortController | null = null;
  let hasData = false;
  let state: LoadState<T> = { items: [], phase: 'idle', stale: false, error: null, intent };
  const listeners = new Set<(value: LoadState<T>) => void>();
  const publish = (next: LoadState<T>) => { state = next; listeners.forEach(listener => listener(state)); };
  return {
    get state() { return state; },
    subscribe(listener: (value: LoadState<T>) => void) {
      listeners.add(listener);
      listener(state);
      return () => listeners.delete(listener);
    },
    async load(query: Q) {
      const current = ++intent;
      controller?.abort();
      const active = new AbortController();
      controller = active;
      publish({ ...state, phase: hasData ? 'refreshing' : 'loading', stale: hasData, error: null, intent: current });
      try {
        const items = await request(query, active.signal);
        if (current !== intent || active.signal.aborted) return false;
        hasData = true;
        controller = null;
        publish({ items, phase: 'success', stale: false, error: null, intent: current });
        return true;
      } catch (error) {
        if (current !== intent || active.signal.aborted) return false;
        controller = null;
        publish({ ...state, phase: 'error', stale: hasData, error: error instanceof Error ? error.message : 'The request failed.', intent: current });
        return false;
      }
    },
    cancel() {
      if (!controller) return;
      controller.abort();
      controller = null;
      publish({ ...state, phase: hasData ? 'success' : 'idle', stale: hasData, error: null, intent: ++intent });
    }
  };
}

/** One owner for pending mutations; both UI disablement and this gate prevent
 * duplicate writes, including programmatic calls before a DOM repaint. */
export function createSubmitGate<T, R>(action: (input: T) => Promise<R>) {
  let busy = false;
  return {
    get busy() { return busy; },
    async submit(input: T): Promise<{ accepted: false } | { accepted: true; value: R }> {
      if (busy) return { accepted: false };
      busy = true;
      try { return { accepted: true, value: await action(input) }; }
      finally { busy = false; }
    }
  };
}
