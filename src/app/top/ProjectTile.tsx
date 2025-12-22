import { TopProject } from "@/services/projectsService";
import Link from "next/link";
import React from "react";
import Image from "next/image";

interface ProjectTileProps {
  project: TopProject;
}

const ProjectTile: React.FC<ProjectTileProps> = ({ project }) => {
  return (
    <div className="bg-gray-800 shadow rounded overflow-hidden hover:shadow-xl hover:scale-105 transition-all duration-300 flex flex-col min-h-[180px]">
      <div className="flex-1 flex items-center justify-center w-full">
        <Link href={`project/${project?.projectId}`} className="w-full h-full flex items-center justify-center relative">
          {project?.image ? (
            <Image
              src={project.image}
              alt={project.name}
              fill
              className="object-contain w-full h-full cursor-pointer"
              unoptimized={project.image.startsWith('data:')}
              sizes="100vw"
              priority={false}
            />
          ) : (
            <span className="text-gray-200">No Image</span>
          )}
        </Link>
      </div>
      <div className="px-2 py-1 bg-gray-900 w-full flex-shrink-0">
        <h3 className="text-xs font-bold truncate text-gray-100 text-center">
          {project ? project.name : "Placeholder"}
        </h3>
      </div>
    </div>
  );
};

export default ProjectTile;
