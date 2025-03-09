import React from "react";
import { useMainStore } from "../stores/useMainStore";

interface LeftPanelProps {
  isCollapsed: boolean;
  toggleCollapse: () => void;
}

const LeftPanel: React.FC<LeftPanelProps> = ({
  isCollapsed,
  toggleCollapse,
}) => {
  const files = useMainStore((state) => state.files);
  const selectedFile = useMainStore((state) => state.selectedFile);
  const setSelectedFile = useMainStore((state) => state.setSelectedFile);

  return (
    <div
      className={`transition-width duration-300 ${
        isCollapsed ? "w-[20px]" : "w-1/4"
      } bg-gray-900 border-r border-gray-700`}
    >
      <div className="flex justify-between">
        {!isCollapsed && <span className="p-2 text-white">Files</span>}
        <button onClick={toggleCollapse} className="p-2 text-white">
          {isCollapsed ? ">" : "<"}
        </button>
      </div>
      {!isCollapsed && (
        <ul className="text-white">
          {files.map((file) => (
            <li
              key={file}
              className={`cursor-pointer p-2 ${
                file === selectedFile ? "bg-gray-700" : ""
              }`}
              onClick={() => setSelectedFile(file)}
            >
              {file}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LeftPanel;
