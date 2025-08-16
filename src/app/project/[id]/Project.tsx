"use client";
import React, { useState, useEffect } from "react";
import { useProjectStore } from "@/components/providers/ProjectStoreProvider";
import LinkButton from "@/components/LinkButton";
import HomeButton from "@/components/HomeButton";
import AuthButtons from "@/components/AuthButtons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Main from "./Main";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { CheckIcon } from "lucide-react";

export default function Project({ project }: any) {
  const { setContent } = useProjectStore((state) => state);
  useEffect(() => {
    const pathname = window.location.pathname;
    if (pathname.endsWith("/new") && project?.projectId) {
      window.history.replaceState(
        {},
        "",
        pathname.replace("/new", `/${project.projectId}`),
      );
    }
    setContent(project.fileContents);
  }, []);

  const [isEditing, setIsEditing] = useState(false);
  const [newProjectName, setNewProjectName] = useState(project.name);

  const handleSave = () => {
    setNewProjectName(newProjectName);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSave();
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <Header
        left={
          <div className="flex items-center space-x-4">
            <HomeButton />
            {isEditing ? (
              <div className="flex items-center space-x-2">
                <Input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <Button variant="ghost" onClick={handleSave}>
                  <CheckIcon className="w-6 h-6" />
                </Button>
              </div>
            ) : (
              <Label
                className="border border-gray-700 p-2 h-[36px] rounded-lg"
                onClick={() => setIsEditing(true)}
              >
                {newProjectName}
              </Label>
            )}
          </div>
        }
        right={
          <div className="flex space-x-4">
            <LinkButton href="/project/new">New</LinkButton>
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
