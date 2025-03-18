import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

import App from "./components/App";
import ViewApp from "./components/ViewApp";
import "./styles/index.css";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
  <React.StrictMode>
    <Router>
      <Routes>
        {/* Route for /view/{id} */}
        <Route path="/view/:id" element={<ViewApp />} />
        {/* Default route */}
        <Route path="/*" element={<App />} />
      </Routes>
    </Router>
  </React.StrictMode>
);
