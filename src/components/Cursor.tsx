import { useEffect, useRef } from "react";
import { isCoarse } from "../lib/engine";

export default function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (isCoarse()) return;
    const root = document.documentElement;
    root.classList.add("has-cursor");
    let mx = -100;
    let my = -100;
    let rx = -100;
    let ry = -100;
    let raf = 0;

    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      mx = e.clientX;
      my = e.clientY;
      root.classList.add("cursor-on");
    };
    const over = (e: PointerEvent) => {
      const t = e.target as Element | null;
      const el = t && typeof t.closest === "function" ? t.closest("[data-cursor], a, button, input, label") : null;
      const mode = el ? el.getAttribute("data-cursor") || "link" : "";
      root.classList.toggle("cursor-link", mode === "link");
      root.classList.toggle("cursor-drag", mode === "drag");
      if (labelRef.current) labelRef.current.textContent = mode === "drag" ? "Drag" : "";
    };
    const leave = () => root.classList.remove("cursor-on");
    const down = () => root.classList.add("cursor-down");
    const up = () => root.classList.remove("cursor-down");

    const loop = () => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      if (dotRef.current) dotRef.current.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
      if (ringRef.current) ringRef.current.style.transform = `translate3d(${rx.toFixed(2)}px, ${ry.toFixed(2)}px, 0)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerover", over, { passive: true });
    root.addEventListener("mouseleave", leave);
    window.addEventListener("pointerdown", down, { passive: true });
    window.addEventListener("pointerup", up, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerover", over);
      root.removeEventListener("mouseleave", leave);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      root.classList.remove("has-cursor", "cursor-on", "cursor-link", "cursor-drag", "cursor-down");
    };
  }, []);

  return (
    <div aria-hidden="true">
      <div ref={ringRef} className="cursor cursor-ring">
        <div className="ring" />
        <span ref={labelRef} className="label" />
      </div>
      <div ref={dotRef} className="cursor cursor-dot" />
    </div>
  );
}
