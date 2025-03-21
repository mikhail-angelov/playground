import React, { useState, useEffect, useRef } from "react";
import { useMainStore } from "../../stores/useMainStore";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

interface PreviewPanelProps {
  isCollapsed: boolean;
  toggleCollapse: () => void;
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({
  isCollapsed,
  toggleCollapse,
}) => {
  const preview = useMainStore((state) => state.preview);
  const triggerPreview = useMainStore((state) => state.triggerPreview);
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
    <ResizablePanel    >
<div className="flex justify-between items-center bg-gray-800 px-2 py-1">
        <Button onClick={toggleCollapse} variant="ghost">
          <ChevronRight className="w-6 h-6 text-white" />
        </Button>
        <span className="text-white font-bold">Preview</span>
        <Button
          onClick={triggerPreview}
          variant="outline"
        >
          Run ▶
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
    <div
        className="w-full h-full overflow-y-auto"
      >
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
