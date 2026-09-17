import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * True only after client hydration. Prefer this over a `useEffect` that
 * calls `setState(true)` on mount — that pattern trips
 * `react-hooks/set-state-in-effect` and causes an avoidable extra render.
 */
export function useMounted() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
