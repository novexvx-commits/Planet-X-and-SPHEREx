import Lenis from "lenis";

/**
 * NOCTURNE scroll engine
 * One shared requestAnimationFrame loop drives Lenis inertial scrolling
 * and notifies every scroll-linked scene only when the scroll position
 * (or layout) actually changes. Scenes write CSS variables / transforms
 * directly to the DOM — no React re-renders at 60fps.
 */

export type ScrollFrame = { y: number; vh: number; vw: number };
type Subscriber = (frame: ScrollFrame) => void;

const subscribers = new Set<Subscriber>();
let lenis: Lenis | null = null;
let started = false;
let dirty = true;
let lastY = -1;

export const clamp = (v: number, min = 0, max = 1) => (v < min ? min : v > max ? max : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
/** 0 before a → ramps to 1 by b → holds → ramps back to 0 between c and d */
export const band = (x: number, a: number, b: number, c: number, d: number) =>
  smoothstep(a, b, x) * (1 - smoothstep(c, d, x));

export const isCoarse = () =>
  typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function initEngine() {
  if (started || typeof window === "undefined") return;
  started = true;

  if (!prefersReducedMotion()) {
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, smoothWheel: true });
  }

  const markDirty = () => {
    dirty = true;
  };
  window.addEventListener("resize", markDirty, { passive: true });
  window.addEventListener("load", markDirty);
  if ("ResizeObserver" in window) new ResizeObserver(markDirty).observe(document.body);

  const loop = (time: number) => {
    lenis?.raf(time);
    const y = window.scrollY;
    if (dirty || y !== lastY) {
      dirty = false;
      lastY = y;
      const frame = { y, vh: window.innerHeight, vw: window.innerWidth };
      subscribers.forEach((fn) => fn(frame));
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

export function subscribe(fn: Subscriber) {
  subscribers.add(fn);
  dirty = true;
  return () => {
    subscribers.delete(fn);
  };
}

export function scrollToTarget(
  target: string | HTMLElement | number,
  opts: { offset?: number; duration?: number; immediate?: boolean } = {}
) {
  const el: HTMLElement | number | null =
    typeof target === "string" ? document.querySelector<HTMLElement>(target) : target;
  if (el === null) return;
  if (lenis) {
    lenis.scrollTo(el, {
      offset: opts.offset ?? 0,
      duration: opts.duration ?? 1.8,
      immediate: opts.immediate,
      force: true,
      easing: (t: number) => 1 - Math.pow(1 - t, 4),
    });
    return;
  }
  const top =
    typeof el === "number" ? el : el.getBoundingClientRect().top + window.scrollY + (opts.offset ?? 0);
  window.scrollTo({ top, behavior: opts.immediate ? "auto" : "smooth" });
}

export function setScrollLocked(locked: boolean) {
  if (lenis) {
    if (locked) lenis.stop();
    else lenis.start();
  }
  document.documentElement.classList.toggle("scroll-locked", locked);
}
