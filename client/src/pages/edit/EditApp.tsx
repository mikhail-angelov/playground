import React, { useState } from "react";
import { useActiveStore } from "../../stores/useActiveStore";
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
  const { t } = useLingui();
  const name = useActiveStore((state) => state.name);
  const setName = useActiveStore((state) => state.setName);
  const projectEmail = useActiveStore((state) => state.email);
  const error = useActiveStore((state) => state.error);
  const setError = useActiveStore((state) => state.setError);
  const [isEditing, setIsEditing] = useState(false);
  const [newProjectName, setNewProjectName] = useState(name);
  const cloneProject = useActiveStore((state) => state.cloneProject);
  const selectedFile = useActiveStore((state) => state.selectedFile);
  const lastPublish = useActiveStore((state) => state.lastPublish);

  const userEmail = useAuthStore((state) => state.email);
  const showForkButton = userEmail !== projectEmail && userEmail;
  const showPublishButton =
    userEmail && (userEmail === projectEmail || !projectEmail);

  const handleSave = () => {
    setName(newProjectName);
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
                {name}
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
            {`${t`Last published`}: ${
              lastPublish ? lastPublish : t`Not published yet`
            }`}
          </Label>
        }
      />
    </div>
  );
};

export default EditApp;
