import React from "react";

import ViewProject from "./ViewProject";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { useActiveStore } from "@/stores/useActiveStore";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Trans } from "@lingui/react/macro";

const ViewApp: React.FC = () => {
  const name = useActiveStore((state) => state.name);
  const projectId = useActiveStore((state) => state.projectId); // Get projectId from useActiveStore
  const navigate = useNavigate();

  const handleEdit = () => {
    navigate(`/edit/${projectId}`);
  };

  return (
    <div className="flex flex-col h-screen">
      <Header
        center={<h1 className="text-lg">{name}</h1>}
        right={
          <Button variant="outline" onClick={handleEdit}>
            <Trans>Edit</Trans>
          </Button>
        }
      />
      <ViewProject />
      <Footer />
    </div>
  );
};

export default ViewApp;
