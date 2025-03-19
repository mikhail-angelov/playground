import React from "react";
import { useMainStore } from "../../stores/useMainStore";
import { useNavigate } from "react-router-dom";

const Header: React.FC = () => {
  const projectName = useMainStore((state) => state.projectName); // Get projectName from useMainStore
  const projectId = useMainStore((state) => state.projectId); // Get projectId from useMainStore
  const navigate = useNavigate();

  const handleEdit = () => {
    navigate(`/edit/${projectId}`);
  };

  return (
    <header className="flex items-center justify-between p-4 bg-gray-900 text-white">
      <h1 className="text-2xl font-bold">View: {projectName}</h1>
      <button
        onClick={handleEdit}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Edit
      </button>
    </header>
  );
};

export default Header;