import React, { useState } from "react";
import { useMainStore } from "../stores/useMainStore";

const Header: React.FC = () => {
  const projectName = useMainStore((state) => state.projectName);
  const setProjectName = useMainStore((state) => state.setProjectName);
  const [isEditing, setIsEditing] = useState(false);
  const [newProjectName, setNewProjectName] = useState(projectName);
  const triggerPreview = useMainStore((state) => state.triggerPreview);

  const handleSave = () => {
    setProjectName(newProjectName);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSave();
    }
  };

  return (
    <header className="flex items-center justify-between p-4 bg-gray-900 text-white">
      <div className="flex items-center space-x-4">
        <h2 className="ml-2 text-4xl">🃟</h2>
        {isEditing ? (
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="px-2 py-1 text-black rounded"
            />
            <button
              onClick={handleSave}
              className="px-2 py-1 bg-green-600 rounded hover:bg-green-700"
            >
              ✔
            </button>
          </div>
        ) : (
          <span
            className="text-xl font-bold cursor-pointer"
            onClick={() => setIsEditing(true)}
          >
            {projectName}
          </span>
        )}
      </div>
      <div className="flex space-x-4">
        <button
          className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
          onClick={triggerPreview}
        >
          Run ▶
        </button>
        <button className="px-4 py-2 bg-green-600 rounded hover:bg-green-700">
          Publish
        </button>
      </div>
    </header>
  );
};

export default Header;
