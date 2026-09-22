"use client";

import { useEffect, type RefObject } from "react";

export function useClickOutside(
  refs: RefObject<HTMLElement | null>[],
  onOutside: () => void,
  active = true
) {
  useEffect(() => {
    if (!active) return;
    function handler(event: MouseEvent) {
      const target = event.target as Node;
      const isInside = refs.some((ref) => ref.current?.contains(target));
      if (!isInside) onOutside();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [refs, onOutside, active]);
}
