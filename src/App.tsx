import { RouterProvider, useRouter } from "./lib/router";
import HomePage from "./pages/HomePage";
import ExperiencePage from "./pages/ExperiencePage";

function AppContent() {
  const { isExperience } = useRouter();

  if (isExperience) {
    return <ExperiencePage />;
  }

  return <HomePage />;
}

export default function App() {
  return (
    <RouterProvider>
      <AppContent />
    </RouterProvider>
  );
}
