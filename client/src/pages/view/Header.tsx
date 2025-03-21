import React from "react";
import { useMainStore } from "../../stores/useMainStore";
import { useNavigate } from "react-router-dom";
import HomeButton from "../../components/HomeButton";
import { Button } from "../../components/ui/button";

const Header: React.FC = () => {
  const projectName = useMainStore((state) => state.projectName); // Get projectName from useMainStore
  const projectId = useMainStore((state) => state.projectId); // Get projectId from useMainStore
  const navigate = useNavigate();

  const handleEdit = () => {
    navigate(`/edit/${projectId}`);
  };

  return (
    <header className="flex items-center justify-between p-4">
      <HomeButton />
      <h1 className="text-2xl font-bold">View: {projectName}</h1>
      <Button variant="outline" onClick={handleEdit}>
        Edit
      </Button>
    </header>
  );
};

export default Header;
