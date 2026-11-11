import { useEffect, useState } from "react";
import { initEngine, setScrollLocked } from "./lib/engine";
import { RouterProvider, useRouter } from "./lib/router";
import Loader from "./components/Loader";
import FluidCursor from "./components/FluidCursor";
import Nav from "./components/Nav";
import SceneIndex from "./components/SceneIndex";
import Hero from "./sections/Hero";
import Prologue from "./sections/Prologue";
import SpherexHub from "./components/spherex/SpherexHub";
import Spacewalk from "./sections/Spacewalk";
import Voyage from "./sections/Voyage";
import Spotlight from "./sections/Spotlight";
import ZigZag from "./sections/ZigZag";
import FirstLight from "./sections/FirstLight";
import MissionLog from "./sections/MissionLog";
import Telemetry from "./sections/Telemetry";
import Systems from "./sections/Systems";
import Vision from "./sections/Vision";
import Finale from "./sections/Finale";

function AppContent() {
  const [ready, setReady] = useState(false);
  const { route } = useRouter();

  // Boot the scroll engine; hold the page at the top while the loader runs.
  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    initEngine();
    setScrollLocked(true);
  }, []);

  // Once the curtain lifts: release scroll and arm the reveal observer.
  useEffect(() => {
    if (!ready) return;
    setScrollLocked(false);
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
      { rootMargin: "0px 0px -10% 0px", threshold: 0.01 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [ready]);

  // When switching routes via client navigation, ensure visible elements are in
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>("[data-reveal]");
    els.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight) {
        el.classList.add("is-in");
      }
    });
  }, [route]);

  return (
    <>
      <Loader onComplete={() => setReady(true)} />
      <FluidCursor />
      <div className="grain" aria-hidden="true" />
      <Nav ready={ready} />
      <SceneIndex />
      <main className="page">
        <Hero ready={ready} />
        <Prologue />
        <SpherexHub />
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

export default function App() {
  return (
    <RouterProvider>
      <AppContent />
    </RouterProvider>
  );
}
