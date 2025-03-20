import React, { useEffect } from "react";
import { useAuthStore } from "./stores/useAuthStore";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomeApp from "./pages/home/HomeApp";
import EditApp from "./pages/edit/EditApp";
import ViewApp from "./pages/view/ViewApp";

const App: React.FC = () => {
  const checkAuthStatus = useAuthStore((state) => state.checkAuthStatus);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  return (
    <React.StrictMode>
    <Router>
      <Routes>
        <Route path="/view/:id" element={<ViewApp />} />
        <Route path="/edit/:id" element={<EditApp />} />
        <Route path="/" element={<HomeApp />} />
      </Routes>
    </Router>
  </React.StrictMode>
  );
};

export default App;