import React, { useEffect } from "react";
import { useParams } from "react-router-dom";

import ProjectList from "./ProjectList";
import { useActiveStore } from "../../stores/useActiveStore";
import Header from "@/components/Header";
import NewProjectButton from "@/components/NewProjectButton";
import AuthButtons from "@/components/AuthButtons";
import Footer from "@/components/Footer";

const Top: React.FC = () => {
  const loadFileContents = useActiveStore((state) => state.loadFileContents);
  const triggerPreview = useActiveStore((state) => state.triggerPreview);

  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    if (id) {
      console.log(`Viewing project with ID: ${id}`);
      loadFileContents(id).then(triggerPreview);
    }
  }, [id]);

  return (
    <div className="flex flex-col h-screen">
      <Header
        right={
          <div className="flex items-center space-x-4">
            <NewProjectButton />
            <AuthButtons />
          </div>
        }
      />
      <ProjectList />
      <Footer />
    </div>
  );
};

export default Top;
