import React from "react";
import { useNavigate } from "react-router-dom";
import { useMainStore } from "../stores/useMainStore";
import { Button } from "./ui/button";
import { Trans } from "@lingui/react/macro";

const NewProjectButton: React.FC = () => {
  const navigate = useNavigate();
  const newProject = useMainStore((state) => state.newProject);

  const handleNewProject = () => {
    const projectId = newProject();
    navigate(`/edit/${projectId}`); // Navigate back to the main app with the project ID
  };

  return (
    <Button variant="outline" 
      onClick={handleNewProject}
    >
      <Trans>New</Trans>
    </Button>
  );
};

export default NewProjectButton;
