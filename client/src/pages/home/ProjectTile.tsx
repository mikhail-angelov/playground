import React from "react";

interface ProjectTileProps {
  project: {
    projectId: string;
    name: string;
    image: string;
  } | null;
  onClick: (projectId?: string) => void;
}

const ProjectTile: React.FC<ProjectTileProps> = ({ project, onClick }) => {
  return (
    <div
      className="bg-gray-800 shadow rounded overflow-hidden hover:shadow-xl hover:scale-105 transition-all duration-300 flex flex-col items-center justify-center min-h-[200px]"
      onClick={() => onClick(project?.projectId)}
    >
      <div className="w-100 h-32 flex items-center justify-center">
        {project ? (
          <img
            src={`https://app.js2go.ru/${project.projectId}.png`}
            alt={project.name}
            className="max-w-100 h-32 object-cover cursor-pointer"
          />
        ) : (
          <span className="text-gray-500">No Image</span>
        )}
      </div>
      <div className="p-2">
        <h3 className="text-sm font-bold truncate text-gray-100">
          {project ? project.name : "Placeholder"}
        </h3>
      </div>
    </div>
  );
};

export default ProjectTile;
