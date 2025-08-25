import React from "react";
import ProjectTile from "./ProjectTile";
import { TopProject } from "@/services/projectsService";

interface Props {
  projects: TopProject[];
}

const ProjectList: React.FC<Props> = ({ projects }: Props) => {
  return (
    <div
      className="grid grid-cols-3 gap-4 overflow-y-auto overflow-x-hidden flex-1 px-4 pb-4 custom-scrollbar"
      style={{
        gridTemplateRows: "repeat(auto-fill, minmax(200px, 1fr))",
      }}
    >
      {projects.map((project, index) => (
        <ProjectTile project={project} key={index} />
      ))}
    </div>
  );
};

export default ProjectList;
