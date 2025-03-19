import React, { useEffect } from "react";
import { useProjectsStore } from "../../stores/useProjectsStore";
import { useMainStore } from "../../stores/useMainStore"; // Import useMainStore
import { useNavigate } from "react-router-dom";

const ProjectList: React.FC = () => {
  const bestProjects = useProjectsStore((state) => state.bestProjects);
  const loadBestProjects = useProjectsStore((state) => state.loadBestProjects);
  const loadFileContents = useMainStore((state) => state.loadFileContents);
  const setProjectName = useMainStore((state) => state.setProjectName);
  const navigate = useNavigate(); // React Router's navigation hook

  useEffect(() => {
    loadBestProjects(); // Load the best projects on component mount
  }, [loadBestProjects]);

  // Ensure the grid always has 9 items by adding placeholders
  const projectsWithPlaceholders = [
    ...bestProjects,
    ...Array(9 - bestProjects.length).fill(null),
  ];

  const handleProjectClick = (projectId: string, projectName: string) => {
    // Set the project details in useMainStore
    loadFileContents(projectId);
    setProjectName(projectName);

    // Navigate to the edit page for the selected project
    navigate(`/edit/${projectId}`);
  };

  return (
    <div className="grid grid-cols-3 gap-4 p-4 flex-1 bg-gray-900">
      {projectsWithPlaceholders.map((project, index) => (
        <div
          key={index}
          className={`bg-gray-800 shadow rounded overflow-hidden hover:shadow-xl hover:scale-105 transition-all duration-300 flex flex-col items-center justify-center`} // Add hover effect
        >
          {project ? (
            <img
              src={project.image}
              alt={project.name}
              className="max-w-32 h-32 object-cover cursor-pointer"
              onClick={() => handleProjectClick(project.projectId, project.name)} // Pass projectId and projectName
            />
          ) : (
            <div className="w-32 h-32 bg-gray-700 flex items-center justify-center">
              <span className="text-gray-500">No Image</span>
            </div>
          )}
          <div className="p-2">
            <h3 className="text-sm font-bold truncate text-gray-100">
              {project ? project.name : "Placeholder"}
            </h3>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProjectList;