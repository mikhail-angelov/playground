import React, { useEffect } from "react";
import { useAuthStore } from "./stores/useAuthStore";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Top from "./pages/top/Top"
import EditApp from "./pages/edit/EditApp";
import ViewApp from "./pages/view/ViewApp";
import { ThemeProvider } from "./components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { I18nProvider } from "./providers/I18nProvider";
import Profile from "./pages/profile/Profile";
import Home from "./pages/Home"

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
          <Toaster />
        </ThemeProvider>
      </I18nProvider>
    </React.StrictMode>
  );
};

export default App;
