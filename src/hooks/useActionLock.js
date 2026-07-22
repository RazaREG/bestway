import { useCallback, useRef, useState } from "react";

/**
 * Prevents duplicate async actions (double-clicks) while a handler runs.
 */
export function useActionLock() {
  const pendingRef = useRef(new Set());
  const [lockedKeys, setLockedKeys] = useState(() => new Set());

  const syncState = useCallback(() => {
    setLockedKeys(new Set(pendingRef.current));
  }, []);

  const isLocked = useCallback((key) => lockedKeys.has(key), [lockedKeys]);

  const run = useCallback(
    async (key, fn) => {
      if (pendingRef.current.has(key)) return;
      pendingRef.current.add(key);
      syncState();

      try {
        return await fn();
      } finally {
        pendingRef.current.delete(key);
        syncState();
      }
    },
    [syncState]
  );

  return { run, isLocked };
}
