import { useEffect, useRef, type RefObject } from "react";
import { clamp, subscribe } from "../lib/engine";

/**
 * pin     → 0 when the element's top hits the viewport top, 1 when its bottom hits the viewport bottom
 *           (perfect for tall sections with a sticky 100vh stage inside)
 * through → 0 when the element enters from the bottom, 1 when it fully leaves at the top
 * enter   → 0 when the element's top enters the viewport bottom, 1 when its top reaches the viewport top
 */
export type ProgressMode = "pin" | "through" | "enter";

export function useScrollProgress<T extends HTMLElement>(
  ref: RefObject<T | null>,
  cb: (p: number, el: T, vh: number) => void,
  mode: ProgressMode = "pin"
) {
  const cbRef = useRef(cb);
  cbRef.current = cb;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let last = -1;
    return subscribe(({ vh }) => {
      const r = el.getBoundingClientRect();
      let p: number;
      if (mode === "pin") p = clamp(-r.top / Math.max(1, r.height - vh));
      else if (mode === "through") p = clamp((vh - r.top) / (vh + r.height));
      else p = clamp((vh - r.top) / vh);
      if (Math.abs(p - last) < 0.00005) return;
      last = p;
      cbRef.current(p, el, vh);
    });
  }, [ref, mode]);
}
