import React, { useState, useEffect, useRef } from "react";
import { useActiveStore } from "../../stores/useActiveStore";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, ViewIcon } from "lucide-react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Trans } from "@lingui/react/macro";

interface PreviewPanelProps {
  isCollapsed: boolean;
  toggleCollapse: () => void;
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({
  isCollapsed,
  toggleCollapse,
}) => {
  const preview = useActiveStore((state) => state.preview);
  const projectId = useActiveStore((state) => state.projectId);
  const triggerPreview = useActiveStore((state) => state.triggerPreview);
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

  const onPreview = () => {
    const url = `${location.origin}/view/${projectId}`;
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(preview); // Write the preview content to the new tab
      newWindow.document.close(); // Close the document to render the content
    } else {
      console.error("Failed to open a new tab for the preview.");
    }
  };

  if (isCollapsed) {
    return (
      <div className="bg-gray-900 border-l border-gray-700 flex flex-col">
        <Button variant="ghost" onClick={toggleCollapse}>
          <ChevronLeft className="w-6 h-6 text-white" />
        </Button>
      </div>
    );
  }

  return (
    <ResizablePanelGroup direction="vertical">
      <ResizablePanel>
        <div className="flex justify-between items-center bg-gray-800 px-2 py-1">
          <Button onClick={toggleCollapse} variant="ghost">
            <ChevronRight className="w-6 h-6 text-white" />
          </Button>
          <span className="text-white font-bold">
            <Trans>Preview</Trans>
          </span>
          <Button asChild variant="outline">
            <a href={`${location.origin}/view/${projectId}`} target="_blank">
              <ViewIcon className="w-6 h-6" />
            </a>
          </Button>
          <Button onClick={triggerPreview} variant="outline">
            <Trans>Run ▶</Trans>
          </Button>
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
      <ResizablePanel>
        <div className="w-full h-full overflow-y-auto">
          <h3 className="mx-2">
            <Trans>Console Output</Trans>
          </h3>
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
