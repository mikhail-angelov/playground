import React from "react";
import { useNavigate } from "react-router-dom";
import { useMainStore } from "../stores/useMainStore";

const NewProjectButton: React.FC = () => {
  const navigate = useNavigate();
  const newProject = useMainStore((state) => state.newProject);

  const handleNewProject = () => {
    const projectId = newProject();
    navigate(`/edit/${projectId}`); // Navigate back to the main app with the project ID
  };

  return (
    <button
      onClick={handleNewProject}
      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
    >
      New project
    </button>
  );
};

export default NewProjectButton;
