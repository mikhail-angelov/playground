import React, { useEffect, useState } from "react";
import { useProjectsStore } from "../../stores/useProjectsStore";
import { useActiveStore } from "../../stores/useActiveStore";
import { useNavigate } from "react-router-dom";
import ProjectTile from "./ProjectTile";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Trans } from "@lingui/react/macro";
import { LoaderIcon } from "lucide-react";

const ProjectList: React.FC = () => {
  const projects = useProjectsStore((state) => state.projects);
  const isLoading = useProjectsStore((state) => state.isLoading);
  const loadProjects = useProjectsStore((state) => state.loadProjects);
  const deleteProject = useProjectsStore((state) => state.deleteProject);
  const loadFileContents = useActiveStore((state) => state.loadFileContents);
  const newProject = useActiveStore((state) => state.newProject);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"trends" | "myProjects">("trends");

  useEffect(() => {
    loadProjects(activeTab === "myProjects");
  }, [activeTab, loadProjects]);

  let projects9 = projects;
  if(projects.length < 9) {
    projects9 = [...projects, ...Array(9 - projects.length).fill(null)];
  }

  const handleProjectClick = (projectId?: string) => {
    let id = projectId;
    console.log("ProjectList.tsx handleProjectClick", id);
    if (id) {
      loadFileContents(id);
    } else {
      id = newProject();
    }
    navigate(`/edit/${id}`);
  };

  return (
    <div className="flex flex-col items-center flex-1 overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <LoaderIcon className="w-12 h-12 text-white animate-spin" />
        </div>
      )}
      <div className="flex space-x-2 m-2">
        <Button
          variant={activeTab === "trends" ? "default" : "outline"}
          onClick={() => setActiveTab("trends")}
        >
          <Trans>Trends</Trans>
        </Button>
        <Button
          variant={activeTab === "myProjects" ? "default" : "outline"}
          onClick={() => setActiveTab("myProjects")}
        >
          <Trans>My Projects</Trans>
        </Button>
      </div>

      <div
        className="grid grid-cols-3 gap-4 overflow-y-auto overflow-x-hidden flex-1 px-4 pb-4 custom-scrollbar"
        style={{
          gridTemplateRows: "repeat(auto-fill, minmax(200px, 1fr))",
        }}
      >
        {projects9.map((project, index) => (
          <ContextMenu key={index}>
            <ContextMenuTrigger>
              <ProjectTile project={project} onClick={handleProjectClick} />
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem
                onClick={() => handleProjectClick(project?.projectId)}
              >
                Open
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() => deleteProject(project?.projectId)}
              >
                Delete
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        ))}
      </div>
    </div>
  );
};

export default ProjectList;
