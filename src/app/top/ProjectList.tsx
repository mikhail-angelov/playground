import React from "react";
import ProjectTile from "./ProjectTile";
import { TopProject } from "@/services/projectsService";

interface Props {
  projects: TopProject[];
  label: string;
}

const ProjectList: React.FC<Props> = ({ projects, label }: Props) => {
  return (
    <ul
      id="project-list"
      aria-label={label}
      className="grid grid-cols-3 gap-4 overflow-y-auto overflow-x-hidden flex-1 w-full max-w-[1500px] p-4 custom-scrollbar"
      style={{
        gridTemplateRows: "repeat(auto-fill, minmax(200px, 1fr))",
      }}
    >
      {projects.map((project) => (
        <ProjectTile project={project} key={project.id} />
      ))}
    </ul>
  );
};

export default ProjectList;
