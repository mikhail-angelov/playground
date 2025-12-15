import { TopProject } from "@/services/projectsService";
import Link from "next/link";
import React from "react";
import Image from "next/image";

interface ProjectTileProps {
  project: TopProject;
}

const ProjectTile: React.FC<ProjectTileProps> = ({ project }) => {
  return (
    <div className="bg-gray-800 shadow rounded overflow-hidden hover:shadow-xl hover:scale-105 transition-all duration-300 flex flex-col items-center justify-center min-h-[200px]">
      <Link href={`project/${project?.projectId}`}>
        <div className="w-100 h-32 flex items-center justify-center">
          {project?.image ? (
            <Image
              src={project.image}
              alt={project.name}
              width={128}
              height={128}
              className="max-w-100 h-32 object-cover cursor-pointer"
              unoptimized={project.image.startsWith('data:')}
            />
          ) : (
            <span className="text-gray-200">No Image</span>
          )}
        </div>
      </Link>
      <div className="p-2">
        <h3 className="text-sm font-bold truncate text-gray-100">
          {project ? project.name : "Placeholder"}
        </h3>
      </div>
    </div>
  );
};

export default ProjectTile;
