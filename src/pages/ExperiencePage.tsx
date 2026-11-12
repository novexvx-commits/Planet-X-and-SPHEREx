import { useEffect } from "react";
import { clearInlineOverflowLocks, setScrollLocked } from "../lib/engine";
import FluidCursor from "../components/FluidCursor";
import SpherexHub from "../components/spherex/SpherexHub";

export default function ExperiencePage() {
  useEffect(() => {
    // Unlock any Lenis/loader scroll locks without setting inline overflow-y on body/html
    // (inline overflow-y on body breaks CSS position:sticky when returning to HomePage)
    setScrollLocked(false);
    clearInlineOverflowLocks();
    return () => {
      clearInlineOverflowLocks();
    };
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#070b14] text-slate-100 font-sans antialiased selection:bg-amber-500 selection:text-slate-950 flex flex-col">
      <FluidCursor />
      <div className="grain pointer-events-none" aria-hidden="true" />
      <SpherexHub />
    </div>
  );
}
