import React, { useEffect } from "react";
import { useAuthStore } from "./stores/useAuthStore";
import {
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";
import HomeApp from "./pages/home/HomeApp";
import EditApp from "./pages/edit/EditApp";
import ViewApp from "./pages/view/ViewApp";
import { ThemeProvider } from "./components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { useMainStore } from "./stores/useMainStore";

const App: React.FC = () => {
  const checkAuthStatus = useAuthStore((state) => state.checkAuthStatus);
  const loadFileContents = useMainStore((state) => state.loadFileContents);

  useEffect(() => {
    let id = "";
    const paths = window.location.pathname.split("/");
    if (paths.length > 2 && (paths[1] === "view" || paths[1] === "edit")) {
      id = paths[2];
    }
    console.log("App.tsx useEffect", id);
    if (id) {
      loadFileContents(id);
    }
  }, [loadFileContents]);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  return (
    <React.StrictMode>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <Router>
          <Routes>
            <Route path="/view/:id" element={<ViewApp />} />
            <Route path="/edit/:id" element={<EditApp />} />
            <Route path="/" element={<HomeApp />} />
          </Routes>
        </Router>
        <Toaster />
      </ThemeProvider>
    </React.StrictMode>
  );
};

export default App;
