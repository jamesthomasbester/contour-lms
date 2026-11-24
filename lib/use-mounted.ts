import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// True only after hydration. Used for things that differ between server and
// browser, like the theme or the user's local timezone.
export function useMounted() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
