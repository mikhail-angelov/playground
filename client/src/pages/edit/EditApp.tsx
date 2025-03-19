import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import Header from "./Header";
import Main from "./Main";
import Footer from "./Footer";
import { useMainStore } from "../../stores/useMainStore";

const EditApp: React.FC = () => {
  const loadFileContents = useMainStore((state) => state.loadFileContents);
  const { id } = useParams<{ id: string }>();
  
  useEffect(() => {
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

export default EditApp;
