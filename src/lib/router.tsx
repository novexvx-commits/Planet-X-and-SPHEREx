import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

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
      setRoute(getRoute());
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = (path: RoutePath, hash?: string) => {
    const currentPath = window.location.pathname.replace(/\/+$/, "") || "/";
    const targetPath = path;

    if (currentPath !== targetPath || hash) {
      const url = targetPath + (hash ? (hash.startsWith("#") ? hash : `#${hash}`) : "");
      window.history.pushState({}, "", url);
      setRoute(targetPath);
      if (!hash) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        const el = document.querySelector(hash);
        if (el) el.scrollIntoView({ behavior: "smooth" });
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

