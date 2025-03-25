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
      {project ? (
        <img
          src={project.image}
          alt={project.name}
          className="max-w-32 h-32 object-cover cursor-pointer"
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
  );
};

export default ProjectTile;
