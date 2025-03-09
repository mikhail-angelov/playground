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
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleConsoleMessage = (event: MessageEvent) => {
      if (event.data.type === "console") {
        setConsoleOutput((prevOutput) => [...prevOutput, event.data.message]);
      }
    };

    window.addEventListener("message", handleConsoleMessage);
    
    return () => {
      window.removeEventListener("message", handleConsoleMessage);
    };
  }, []);

  return (
    <div
      className={`transition-width duration-300 ${
        isCollapsed ? "w-[20px]" : "w-1/4"
      } bg-gray-900 border-l border-gray-700 flex flex-col`}
    >
      <div className="flex justify-between">
        <button onClick={toggleCollapse} className="p-2 text-white">
          {isCollapsed ? "<" : ">"}
        </button>
        {!isCollapsed && <span className="p-2 text-white">Preview</span>}
      </div>
      {!isCollapsed && (
        <>
          <iframe
            ref={iframeRef}
            srcDoc={preview}
            title="Preview"
            className="w-full h-2/3 bg-gray-900"
          />
          <div className="w-full h-1/3 bg-gray-800 text-white p-2 overflow-y-auto">
            <h3 className="text-lg font-bold">Console Output</h3>
            <div>
              {consoleOutput.map((message, index) => (
                <div key={index} className="text-sm">
                  {message}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PreviewPanel;
