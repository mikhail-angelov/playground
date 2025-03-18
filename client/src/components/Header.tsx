import React, { useEffect, useState } from "react";
import { useMainStore } from "../stores/useMainStore";
import { useAuthStore } from "../stores/useAuthStore";
import LoginModal from "./LoginModal";
import PublishedUrlModal from "./PublishedUrlModal";

const Header: React.FC = () => {
  const projectName = useMainStore((state) => state.projectName);
  const setProjectName = useMainStore((state) => state.setProjectName);
  const uploadFiles = useMainStore((state) => state.uploadFiles);
  const error = useMainStore((state) => state.error); 
  const setError = useMainStore((state) => state.setError); 
  const [isEditing, setIsEditing] = useState(false);
  const [newProjectName, setNewProjectName] = useState(projectName);
  const triggerPreview = useMainStore((state) => state.triggerPreview);

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isPublishedModalOpen, setIsPublishedModalOpen] = useState(false); 
  const [publishedUrl, setPublishedUrl] = useState(""); 

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const checkAuthStatus = useAuthStore((state) => state.checkAuthStatus);
  const onLogout = useAuthStore((state) => state.logout);

  const handleSave = () => {
    setProjectName(newProjectName);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSave();
    }
  };

  const handlePublish = async () => {
    const { success, url = "" } = await uploadFiles();
    if (success) {
      setPublishedUrl(url); // Set the published URL
      setIsPublishedModalOpen(true); // Open the PublishedUrlModal
    }
  };

  // Check authentication status on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        await checkAuthStatus();
      } catch (err) {
        console.error("Error checking authentication status:", err);
        setError("Failed to check authentication status. Please try again.");
      }
    };

    checkAuth();
  }, [checkAuthStatus, setError]);

  return (
    <>
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
          <button
            className="px-4 py-2 bg-green-600 rounded hover:bg-green-700"
            onClick={handlePublish}
          >
            Publish
          </button>
          {!isAuthenticated ? (
            <button
              className="px-4 py-2 bg-yellow-600 rounded hover:bg-yellow-700"
              onClick={() => setIsLoginModalOpen(true)}
            >
              Login
            </button>
          ) : (
            <button
              className="px-4 py-2 bg-red-600 rounded hover:bg-red-700"
              onClick={onLogout}
            >
              Logout
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="p-4 bg-red-600 text-white text-center">
          {error}
          <button
            className="ml-4 px-2 py-1 bg-gray-800 rounded hover:bg-gray-700"
            onClick={() => setError("")} // Clear the error in the store
          >
            Dismiss
          </button>
        </div>
      )}

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />

      <PublishedUrlModal
        isOpen={isPublishedModalOpen}
        onClose={() => setIsPublishedModalOpen(false)}
        url={publishedUrl}
      />
    </>
  );
};

export default Header;