import React from "react";
import { useProjectStore } from "@/components/providers/ProjectStoreProvider";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  ChevronLeft,
  FileCode,
  FileText,
  FileJson,
} from "lucide-react";
import { contentFiles } from "@/dto/project.dto";

interface LeftPanelProps {
  isCollapsed: boolean;
  toggleCollapse: () => void;
}

const LeftPanel: React.FC<LeftPanelProps> = ({
  isCollapsed,
  toggleCollapse,
}) => {
  const { selectedFile, setSelectedFile } = useProjectStore((state) => state);

  // Map file extensions to icons
  const getFileIcon = (file: string) => {
    if (file.endsWith(".html"))
      return <FileCode className="w-6 h-6 text-white" />;
    if (file.endsWith(".css"))
      return <FileText className="w-6 h-6 text-white" />;
    if (file.endsWith(".js"))
      return <FileJson className="w-6 h-6 text-white" />;
    return null; // Default case (no icon)
  };

  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center space-y-4 p-2 bg-gray-900 h-full">
        <Button onClick={toggleCollapse} variant="ghost">
          <ChevronRight className="w-6 h-6 text-white" />
        </Button>
        {contentFiles.map((file) => (
          <Button
            key={file}
            variant="ghost"
            onClick={() => setSelectedFile(file)}
            className={`flex flex-col items-center p-0 ${
              file === selectedFile ? "bg-gray-700" : ""
            }`}
          >
            {getFileIcon(file)}
            <span className="text-xs text-white">{file.split(".")[0]}</span>
          </Button>
        ))}
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
        {contentFiles.map((file) => (
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
