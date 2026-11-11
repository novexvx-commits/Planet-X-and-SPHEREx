import { useEffect } from "react";
import FluidCursor from "../components/FluidCursor";
import SpherexHub from "../components/spherex/SpherexHub";

export default function ExperiencePage() {
  useEffect(() => {
    // Ensure scroll is completely unlocked on document & body
    document.documentElement.classList.remove("scroll-locked");
    document.documentElement.style.overflowY = "auto";
    document.body.style.overflowY = "auto";
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#070b14] text-slate-100 font-sans antialiased selection:bg-amber-500 selection:text-slate-950 flex flex-col">
      <FluidCursor />
      <div className="grain pointer-events-none" aria-hidden="true" />
      <SpherexHub />
    </div>
  );
}
