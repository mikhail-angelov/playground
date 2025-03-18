import React, { useEffect } from "react";
import Header from "./Header";
import Main from "./Main";
import Footer from "./Footer";
import { useMainStore } from "../stores/useMainStore";

const App: React.FC = () => {
  const loadFileContents = useMainStore((state) => state.loadFileContents);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get("id") ?? "";
    loadFileContents(id);
  }, [loadFileContents]);

  return (
    <div className="flex flex-col h-screen">
      <Header />
      <Main />
      <Footer />
    </div>
  );
};

export default App;
