"use client";
import React, { useState, useEffect } from "react";
import { useProjectStore } from "@/components/providers/ProjectStoreProvider";
import LinkButton from "@/components/LinkButton";
import HomeButton from "@/components/HomeButton";
import AuthButtons from "@/components/AuthButtons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Main from "./Main";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { CheckIcon } from "lucide-react";
import { ProjectDto } from "@/dto/project.dto";

const projectNameClass =
  "flex items-center border border-gray-700 p-2 h-[36px] rounded-lg text-sm leading-none font-medium select-none";

export default function Project({ project }: { project: ProjectDto }) {
  const { setContent, setName, setTags } = useProjectStore((state) => state);
  useEffect(() => {
    const pathname = window.location.pathname;
    if (pathname.endsWith("/new") && project?.projectId) {
      setIsNew(true);
      window.history.replaceState(
        {},
        "",
        pathname.replace("/new", `/${project.projectId}`)
      );
    }
    setContent(project.fileContents);
    setTags(project.projectId,project.tags);
  }, []);

  const [isEditing, setIsEditing] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [newProjectName, setNewProjectName] = useState(project.name);
  const handleSave = () => {
    if (project.name === newProjectName || !project.isMy) {
      return;
    }
    if (project.projectId && !isNew) {
      setName(project?.projectId, newProjectName);
    }
    setNewProjectName(newProjectName);
    setIsEditing(false);
  };
  console.log("---:", project );

  return (
    <div className="flex flex-col h-screen">
      <Header
        left={
          <div className="flex items-center space-x-4">
            <HomeButton />
            {isEditing ? (
              <form
                className="flex items-center space-x-2"
                aria-label="Rename project"
                onSubmit={(event) => {
                  event.preventDefault();
                  handleSave();
                }}
              >
                <label htmlFor="project-name" className="sr-only">Project name</label>
                <Input
                  id="project-name"
                  name="projectName"
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  disabled={!project.isMy}
                />
                <Button type="submit" variant="ghost" aria-label="Save project name">
                  <CheckIcon className="w-6 h-6" />
                </Button>
              </form>
            ) : project.isMy ? (
              <button
                type="button"
                aria-label={newProjectName ? `${newProjectName}, rename project` : "Rename project"}
                className={projectNameClass}
                onClick={() => setIsEditing(true)}
              >
                {newProjectName}
              </button>
            ) : (
              <span className={projectNameClass}>{newProjectName}</span>
            )}
          </div>
        }
        right={
          <div className="flex space-x-4">
            <LinkButton id="new-project" href="/project/new" aria-label="New project">New</LinkButton>
            <AuthButtons />
          </div>
        }
      />
      {/* {error && (
        <div className="p-4 bg-red-600 text-white text-center">
          {error}
          <Button
            variant="destructive"
            onClick={() => setError("")} // Clear the error in the store
          >
            Dismiss
          </Button>
        </div>
      )} */}
      <Main project={project} />
      <Footer
      // left={<Label>{`File: ${selectedFile}`}</Label>}
      // right={
      //   <Label>
      //     {`${`Last published`}: ${
      //       lastPublish ? lastPublish : `Not published yet`
      //     }`}
      //   </Label>
      // }
      />
    </div>
  );
}
