import React, { useState, useEffect, useRef } from "react";
import { useMainStore } from "../stores/useMainStore";

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
  const [consoleHeight, setConsoleHeight] = useState(300);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const dragging = useRef<{ yOffset: number; height: number } | undefined>(
    undefined
  );

  const handleMouseMove = (event: MouseEvent) => {
    if (dragging.current) {
      const { yOffset, height } = dragging.current;
      const newHeight = height - (event.clientY - yOffset);
      setConsoleHeight(
        Math.min(Math.max(newHeight, 200), window.innerHeight - 200)
      ); // Ensure height is between 200px and window height - 200px
    }
  };

  const handleMouseUp = () => {
    dragging.current = undefined;
  };

  const handleMouseDown = (event: React.MouseEvent) => {
    dragging.current = { yOffset: event.clientY, height: consoleHeight };
  };

  const handleConsoleMessage = (event: MessageEvent) => {
    if (event.data.type === "console") {
      setConsoleOutput((prevOutput) => [...prevOutput, event.data.message]);
    }
    if (
      event.data.type === "mousemove" &&
      iframeRef.current &&
      dragging.current
    ) {
      //correct clientX and clientY values to be relative to the iframe
      const rect = iframeRef.current.getBoundingClientRect();
      handleMouseMove({
        clientX: event.data.event.clientX + rect.left,
        clientY: event.data.event.clientY + rect.top,
      } as MouseEvent);
    }
    if (event.data.type === "mouseup" && dragging.current) {
      handleMouseUp();
    }
  };

  useEffect(() => {
    triggerPreview();

    window.addEventListener("message", handleConsoleMessage);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("message", handleConsoleMessage);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  if (isCollapsed) {
    return (
      <div className="bg-gray-900 border-l border-gray-700 flex flex-col">
        <button onClick={toggleCollapse} className="p-2 text-white">
          {"<"}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border-l border-gray-700 flex flex-col">
      <div className="flex justify-between bg-gray-800">
        <button onClick={toggleCollapse} className="p-2 text-white">
          {">"}
        </button>
        <span className="p-2 text-white">Preview</span>
      </div>
      <iframe
        id="iframe"
        ref={iframeRef}
        srcDoc={preview}
        title="Preview"
        className="w-full h-full flex-1"
      />
      <div
        className="w-full bg-gray-800 text-white overflow-y-auto"
        style={{
          height: `${consoleHeight}px`,
          minHeight: `${consoleHeight}px`,
        }}
      >
        <div
          className="w-full h-2 bg-gray-700 cursor-row-resize relative"
          onMouseDown={handleMouseDown}
        >
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-0.5 bg-white"></div>
        </div>
        <h3 className="text-lg font-bold mx-2">Console Output</h3>
        <div className="mx-2">
          {consoleOutput.map((message, index) => (
            <div key={index} className="text-sm">
              {message}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PreviewPanel;
