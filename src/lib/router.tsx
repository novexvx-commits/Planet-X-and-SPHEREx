import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { clearInlineOverflowLocks, scrollToTarget, setScrollLocked } from "./engine";

export type RoutePath = "/" | "/experience";

export function getRoute(): RoutePath {
  if (typeof window === "undefined") return "/";
  const path = window.location.pathname.toLowerCase().replace(/\/+$/, "");
  if (path === "/experience") return "/experience";
  return "/";
}

interface RouterContextType {
  route: RoutePath;
  navigate: (path: RoutePath, hash?: string) => void;
  isExperience: boolean;
}

const RouterContext = createContext<RouterContextType>({
  route: "/",
  navigate: () => {},
  isExperience: false,
});

export function RouterProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<RoutePath>(getRoute);

  useEffect(() => {
    const handlePopState = () => {
      clearInlineOverflowLocks();
      setScrollLocked(false);
      setRoute(getRoute());
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = (path: RoutePath, hash?: string) => {
    const currentPath = window.location.pathname.replace(/\/+$/, "") || "/";
    const targetPath = path;

    if (currentPath !== targetPath || hash) {
      clearInlineOverflowLocks();
      setScrollLocked(false);
      const url = targetPath + (hash ? (hash.startsWith("#") ? hash : `#${hash}`) : "");
      window.history.pushState({}, "", url);
      setRoute(targetPath);
      if (!hash) {
        scrollToTarget(0, { immediate: true });
      } else {
        window.setTimeout(() => {
          const el = document.querySelector<HTMLElement>(hash);
          if (el) scrollToTarget(el);
        }, 60);
      }
    }
  };

  const isExperience = route === "/experience";

  return (
    <RouterContext.Provider value={{ route, navigate, isExperience }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  return useContext(RouterContext);
}
