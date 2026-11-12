import { useEffect, useState } from "react";
import { clearInlineOverflowLocks, initEngine, refreshEngine, scrollToTarget, setScrollLocked } from "../lib/engine";
import Loader from "../components/Loader";
import FluidCursor from "../components/FluidCursor";
import Nav from "../components/Nav";
import SceneIndex from "../components/SceneIndex";
import Hero from "../sections/Hero";
import Prologue from "../sections/Prologue";
import Spacewalk from "../sections/Spacewalk";
import Voyage from "../sections/Voyage";
import Spotlight from "../sections/Spotlight";
import ZigZag from "../sections/ZigZag";
import FirstLight from "../sections/FirstLight";
import MissionLog from "../sections/MissionLog";
import Telemetry from "../sections/Telemetry";
import Systems from "../sections/Systems";
import Vision from "../sections/Vision";
import Finale from "../sections/Finale";

let hasCompletedInitialLoad = false;

export default function HomePage() {
  const [ready, setReady] = useState(() => hasCompletedInitialLoad);

  // Boot the scroll engine; hold the page at the top while the loader runs on first visit.
  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    clearInlineOverflowLocks();
    initEngine();
    scrollToTarget(0, { immediate: true });
    if (!hasCompletedInitialLoad) {
      setScrollLocked(true);
    } else {
      setScrollLocked(false);
      refreshEngine();
    }
    return () => {
      setScrollLocked(false);
      clearInlineOverflowLocks();
    };
  }, []);

  // Once the curtain lifts: release scroll, refresh Lenis & sticky metrics, and arm the reveal observer.
  useEffect(() => {
    if (!ready) return;
    hasCompletedInitialLoad = true;
    clearInlineOverflowLocks();
    setScrollLocked(false);
    refreshEngine();

    const els = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.01 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [ready]);

  return (
    <>
      {!hasCompletedInitialLoad && <Loader onComplete={() => setReady(true)} />}
      <FluidCursor />
      <div className="grain" aria-hidden="true" />
      <Nav ready={ready} />
      <SceneIndex />
      <main className="page">
        <Hero ready={ready} />
        <Prologue />
        <Spacewalk />
        <Voyage />
        <Spotlight />
        <ZigZag />
        <FirstLight />
        <MissionLog />
        <Telemetry />
        <Systems />
        <Vision />
        <Finale />
      </main>
    </>
  );
}
