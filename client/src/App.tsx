import React, { useEffect, Suspense, lazy } from "react";
import { useAuthStore } from "./stores/useAuthStore";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { I18nProvider } from "./providers/I18nProvider";

// Lazy-loaded route components
const Top = lazy(() => import("./pages/top/Top"));
const EditApp = lazy(() => import("./pages/edit/EditApp"));
const ViewApp = lazy(() => import("./pages/view/ViewApp"));
const Profile = lazy(() => import("./pages/profile/Profile"));
const Home = lazy(() => import("./pages/Home"));

const App: React.FC = () => {
  const checkAuthStatus = useAuthStore((state) => state.checkAuthStatus);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const telegramViewId = new URLSearchParams(location.search).get(
    "tgWebAppStartParam",
  );

  return (
    <React.StrictMode>
      <I18nProvider>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <Suspense
            fallback={
              <div className="flex justify-center items-center min-h-screen text-xl">
                Loading...
              </div>
            }
          >
            <Router>
              <Routes>
                {telegramViewId ? (
                  <Route path="*" element={<ViewApp />} />
                ) : (
                  <>
                    <Route path="/view/:id" element={<ViewApp />} />
                    <Route path="/edit/:id" element={<EditApp />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/top" element={<Top />} />
                    <Route path="/" element={<Home />} />
                  </>
                )}
              </Routes>
            </Router>
          </Suspense>
          <Toaster />
        </ThemeProvider>
      </I18nProvider>
    </React.StrictMode>
  );
};

export default App;
