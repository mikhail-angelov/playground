import React, { useEffect } from "react";
import {
  useParams,
} from "react-router-dom";

import Header from "./Header";
import ProjectList from "./ProjectList";
import Footer from "./Footer";
import { useMainStore } from "../../stores/useMainStore";

const HomeApp: React.FC = () => {
  const loadFileContents = useMainStore((state) => state.loadFileContents);
  const triggerPreview = useMainStore((state) => state.triggerPreview);

  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    if (id) {
      console.log(`Viewing project with ID: ${id}`);
      loadFileContents(id).then(triggerPreview);
    }
  }, [id]);

  return (
    <div className="flex flex-col h-screen">
      <Header />
      <ProjectList />
      <Footer />
    </div>
  );
};

export default HomeApp;
