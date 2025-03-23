import React, { useState } from "react";
import { useMainStore } from "../../stores/useMainStore";
import { useAuthStore } from "../../stores/useAuthStore";
import NewProjectButton from "../../components/NewProjectButton";
import HomeButton from "../../components/HomeButton";
import AuthButtons from "../../components/AuthButtons";
import { Button } from "../../components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Main from "./Main";
import Footer from "@/components/Footer";
import { Trans, useLingui } from "@lingui/react/macro";
import Header from "@/components/Header";
import PublishButton from "@/components/PublishButton";
import { CheckIcon } from "lucide-react";

const EditApp: React.FC = () => {
  const {t} = useLingui();
  const projectName = useMainStore((state) => state.projectName);
  const setProjectName = useMainStore((state) => state.setProjectName);
  const projectEmail = useMainStore((state) => state.email);
  const error = useMainStore((state) => state.error);
  const setError = useMainStore((state) => state.setError);
  const [isEditing, setIsEditing] = useState(false);
  const [newProjectName, setNewProjectName] = useState(projectName);
  const cloneProject = useMainStore((state) => state.cloneProject);
  const selectedFile = useMainStore((state) => state.selectedFile);
  const lastPublish = useMainStore((state) => state.lastPublish);

  const userEmail = useAuthStore((state) => state.email);
  const showForkButton = userEmail !== projectEmail && projectEmail;
  const showPublishButton = userEmail === projectEmail || !projectEmail;

  const handleSave = () => {
    setProjectName(newProjectName);
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
                {projectName}
              </Label>
            )}
          </div>
        }
        right={
          <div className="flex space-x-4">
            <NewProjectButton />

            {showForkButton && (
              <Button variant="outline" onClick={cloneProject}>
                <Trans>Fork</Trans>
              </Button>
            )}
            {showPublishButton && <PublishButton />}
            <AuthButtons />
          </div>
        }
      />
      {error && (
        <div className="p-4 bg-red-600 text-white text-center">
          {error}
          <Button
            variant="destructive"
            onClick={() => setError("")} // Clear the error in the store
          >
            <Trans>Dismiss</Trans>
          </Button>
        </div>
      )}
      <Main />
      <Footer
        left={<Label>{t`File: ${selectedFile}`}</Label>}
        right={
          <Label>
            {t`Last published: ${lastPublish ? lastPublish : t`Not published yet`}`}
          </Label>
        }
      />
    </div>
  );
};

export default EditApp;
