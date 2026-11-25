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
      <section aria-label="Project files" className="flex flex-col items-center space-y-4 p-2 bg-gray-900 h-full">
        <Button type="button" onClick={toggleCollapse} variant="ghost" aria-expanded={false} aria-label="Expand files">
          <ChevronRight className="w-6 h-6 text-white" />
        </Button>
        {contentFiles.map((file) => (
          <Button
            key={file}
            variant="ghost"
            onClick={() => setSelectedFile(file)}
            aria-pressed={file === selectedFile}
            aria-label={file}
            aria-controls="source-editor"
            className={`flex flex-col items-center p-0 ${
              file === selectedFile ? "bg-gray-700" : ""
            }`}
          >
            {getFileIcon(file)}
            <span className="text-xs text-white">{file.split(".")[0]}</span>
          </Button>
        ))}
      </section>
    );
  }

  return (
    <section aria-labelledby="project-files-title" className="flex flex-col h-full">
      <div className="flex justify-between bg-gray-800">
        <span id="project-files-title" className="p-2 text-white">Files</span>
        <Button type="button" onClick={toggleCollapse} variant="ghost" aria-expanded={true} aria-label="Collapse files">
          <ChevronLeft className="w-6 h-6 text-white" />
        </Button>
      </div>
      <ul className="text-white">
        {contentFiles.map((file) => (
          <li key={file}>
            <button
              type="button"
              className={`block w-full cursor-pointer p-2 text-left text-sm ${
                file === selectedFile ? "bg-gray-700" : ""
              }`}
              onClick={() => setSelectedFile(file)}
              aria-controls="source-editor"
              aria-pressed={file === selectedFile}
            >
              {file}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default LeftPanel;
