import React from "react";
import { useMainStore } from "../../stores/useMainStore";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft } from "lucide-react";

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

  if (isCollapsed) {
    return (
      <div className="flex flex-col">
        <Button onClick={toggleCollapse} variant="ghost">
        <ChevronRight className="w-6 h-6 text-white" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between bg-gray-800">
        <span className="p-2 text-white">Files</span>
        <Button onClick={toggleCollapse} variant="ghost">
        <ChevronLeft className="w-6 h-6 text-white" />
        </Button>
      </div>
      <ul className="text-white">
        {files.map((file) => (
          <li
            key={file}
            className={`cursor-pointer text-sm p-2 ${
              file === selectedFile ? "bg-gray-700" : ""
            }`}
            onClick={() => setSelectedFile(file)}
          >
            {file}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default LeftPanel;
