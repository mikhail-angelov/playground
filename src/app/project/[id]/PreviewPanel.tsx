import React, { useState, useEffect, useRef } from "react";
import { useProjectStore } from "@/components/providers/ProjectStoreProvider";
import { Button } from "@/components/ui/button";
import { ViewIcon } from "lucide-react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import PublishButton from "./PublishButton";

const PreviewPanel: React.FC = ({ project }: any) => {
  const { preview, projectId, triggerPreview } = useProjectStore(
    (state) => state,
  );
  const userEmail = project.email;
  const hasAi = !!project.hasAi;
  const showForkButton = userEmail !== project.email && userEmail;
  const showPublishButton =
    (userEmail && userEmail === project.email) || !project.email;

  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleConsoleMessage = (event: MessageEvent) => {
    if (event.data.type === "console") {
      setConsoleOutput((prevOutput) => [...prevOutput, event.data.message]);
    }
  };

  useEffect(() => {
    triggerPreview();
    window.addEventListener("message", handleConsoleMessage);

    return () => {
      window.removeEventListener("message", handleConsoleMessage);
    };
  }, []);

  return (
    <ResizablePanelGroup direction="vertical">
      <ResizablePanel>
        <div className="flex justify-between items-center bg-gray-800 px-2 py-1">
          <Button asChild variant="outline">
            <a href={`${location.origin}/view/${projectId}`} target="_blank">
              <ViewIcon className="w-6 h-6" />
            </a>
          </Button>
          <div className="flex items-center gap-2">
            {showForkButton && (
              <Button variant="outline" onClick={cloneProject}>
                Fork
              </Button>
            )}
            {showPublishButton && <PublishButton />}
            <Button onClick={triggerPreview} variant="outline">
              Run ▶
            </Button>
          </div>
        </div>
        <iframe
          id="iframe"
          ref={iframeRef}
          srcDoc={preview}
          title="Preview"
          className="w-full h-full flex-1"
        />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={4}>
        <div className="w-full h-full overflow-y-auto">
          <h3 className="mx-2">Console Output</h3>
          <div className="mx-2 ">
            {consoleOutput.map((message, index) => (
              <div key={index} className="text-sm">
                {message}
              </div>
            ))}
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};

export default PreviewPanel;
