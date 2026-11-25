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
import { composePreview } from "@/lib/actions/preview";
import { ProjectDto } from "@/dto/project.dto";

const PreviewPanel = ({ project }: { project: ProjectDto }) => {
  const { fileContents, cloneProject } = useProjectStore((state) => state);
  const userEmail = project.email;
  const showForkButton = userEmail !== project.email && userEmail;
  const showPublishButton =
    (userEmail && userEmail === project.email) || !project.email;

  const [preview, setPreview] = useState<string>("");
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleConsoleMessage = (event: MessageEvent) => {
    if (event.source === iframeRef.current?.contentWindow && event.data?.type === "console") {
      setConsoleOutput((prevOutput) => [...prevOutput, event.data.message]);
    }
  };

  useEffect(() => {
    setPreview(composePreview(project.fileContents, project.projectId));
    window.addEventListener("message", handleConsoleMessage);

    return () => {
      window.removeEventListener("message", handleConsoleMessage);
    };
  }, []);

  return (
    <ResizablePanelGroup tagName="section" aria-label="Application preview" direction="vertical">
      <ResizablePanel>
        <div className="flex justify-between items-center bg-gray-800 px-2 py-1">
          <Button asChild variant="outline">
            <a
              href={`/view/${project?.projectId}`}
              target="_blank"
              aria-label="Open published project in a new tab"
            >
              <ViewIcon className="w-6 h-6" />
            </a>
          </Button>
          <div className="flex items-center gap-2">
            {showForkButton && (
              <Button variant="outline" onClick={() => cloneProject(userEmail)}>
                Fork
              </Button>
            )}
            {showPublishButton && (
              <PublishButton projectId={project.projectId} />
            )}
            <Button
              id="preview-run"
              type="button"
              aria-controls="application-preview"
              onClick={() => {
                setPreview(composePreview(fileContents, project.projectId));
              }}
              variant="outline"
            >
              Run ▶
            </Button>
          </div>
        </div>
        <iframe
          id="application-preview"
          ref={iframeRef}
          srcDoc={preview}
          title="Application preview"
          className="w-full h-full flex-1"
        />
      </ResizablePanel>
      <ResizableHandle aria-label="Resize preview and console" />
      <ResizablePanel defaultSize={4}>
        <div className="w-full h-full overflow-y-auto">
          <div className="flex justify-between">
            <h3 id="preview-console-title" className="mx-2">Console Output</h3>
            <Button
              type="button"
              aria-label="Clear console output"
              aria-controls="preview-console"
              variant="outline"
              className="size-xs"
              onClick={() => setConsoleOutput([])}
            >
              <span aria-hidden="true">x</span>
            </Button>
          </div>
          <div id="preview-console" role="log" aria-labelledby="preview-console-title" className="mx-2">
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
