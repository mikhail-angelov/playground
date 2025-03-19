import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

import HomeApp from "./pages/home/HomeApp";
import EditApp from "./pages/edit/EditApp";
import ViewApp from "./pages/view/ViewApp";
import "./styles/index.css";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
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
