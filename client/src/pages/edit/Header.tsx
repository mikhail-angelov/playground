import React, { useState } from "react";
import html2canvas from "html2canvas";
import { useMainStore } from "../../stores/useMainStore";
import { useAuthStore } from "../../stores/useAuthStore";
import PublishedUrlModal from "./PublishedUrlModal";
import NewProjectButton from "../../components/NewProjectButton";
import HomeButton from "../../components/HomeButton";
import AuthButtons from "../../components/AuthButtons";

const Header: React.FC = () => {
  const projectName = useMainStore((state) => state.projectName);
  const setProjectName = useMainStore((state) => state.setProjectName);
  const uploadFiles = useMainStore((state) => state.uploadFiles);
  const projectEmail = useMainStore((state) => state.email);
  const error = useMainStore((state) => state.error);
  const setError = useMainStore((state) => state.setError);
  const [isEditing, setIsEditing] = useState(false);
  const [newProjectName, setNewProjectName] = useState(projectName);
  const cloneProject = useMainStore((state) => state.cloneProject);
  const [isPublishedModalOpen, setIsPublishedModalOpen] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState("");

  const userEmail = useAuthStore((state) => state.email);

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
    try {
      // Select the iframe element
      const iframe = document.querySelector("iframe");
      let image = "";

      if (iframe && iframe.contentDocument) {
        // Use html2canvas to capture the iframe content
        const iframeBody = iframe.contentDocument.body;

        const canvas = await html2canvas(iframeBody, {
          useCORS: true, // Enable cross-origin resource sharing if needed
          logging: true, // Enable logging for debugging
          scale: 1, // Adjust the scale for better resolution
        });

        // Convert the canvas content to a Base64 string
        image = canvas.toDataURL("image/png");

        // Call the uploadFiles API with the captured image
        const { success, url = "" } = await uploadFiles(image);

        if (success) {
          setPublishedUrl(url); // Set the published URL
          setIsPublishedModalOpen(true); // Open the PublishedUrlModal
        } else {
          setError("Failed to publish the project. Please try again.");
        }
      } else {
        console.warn("Iframe element not found. Proceeding without an image.");
      }
    } catch (err) {
      console.error("Error during publish:", err);
      setError("An unexpected error occurred while publishing the project.");
    }
  };

  return (
    <>
      <header className="flex items-center justify-between p-4 bg-gray-900 text-white">
        <div className="flex items-center space-x-4">
          <HomeButton />
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
          <NewProjectButton />

          {userEmail !== projectEmail && (
            <button
              className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
              onClick={cloneProject}
            >
              Fork
            </button>
          )}
          {userEmail === projectEmail && (
            <button
              className="px-4 py-2 bg-green-600 rounded hover:bg-green-700"
              onClick={handlePublish}
            >
              Publish
            </button>
          )}
          <AuthButtons />
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

      <PublishedUrlModal
        isOpen={isPublishedModalOpen}
        onClose={() => setIsPublishedModalOpen(false)}
        url={publishedUrl}
      />
    </>
  );
};

export default Header;
