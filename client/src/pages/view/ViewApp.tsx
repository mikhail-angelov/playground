import React from "react";

import ViewProject from "./ViewProject";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { useMainStore } from "@/stores/useMainStore";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const ViewApp: React.FC = () => {
  const projectName = useMainStore((state) => state.projectName);
  const projectId = useMainStore((state) => state.projectId); // Get projectId from useMainStore
  const navigate = useNavigate();

  const handleEdit = () => {
    navigate(`/edit/${projectId}`);
  };

  return (
    <div className="flex flex-col h-screen">
      <Header
        center={<h1 className="text-lg">{projectName}</h1>}
        right={
          <Button variant="outline" onClick={handleEdit}>
            Edit
          </Button>
        }
      />
      <ViewProject />
      <Footer />
    </div>
  );
};

export default ViewApp;
