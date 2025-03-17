import React, { useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { useMainStore } from "../stores/useMainStore";

const getLanguageFromExtension = (fileName: string) => {
  const extension = fileName.split(".").pop();
  switch (extension) {
    case "html":
      return "html";
    case "js":
      return "javascript";
    case "ts":
      return "typescript";
    case "css":
      return "css";
    default:
      return "plaintext";
  }
};

interface EditorPanelProps {
  width: number;
}

const EditorPanel: React.FC<EditorPanelProps> = ({ width }) => {
  const selectedFile = useMainStore((state) => state.selectedFile);
  const fileContent = useMainStore((state) => state.fileContents[selectedFile]);
  const setFileContent = useMainStore((state) => state.setFileContent);
  const editorRef = useRef<any>(null);

  const language = getLanguageFromExtension(selectedFile);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.layout();
    }
  }, [width]);

  return (
    <div className="flex-grow p-1" style={{ width: `${width}px` }}>
      <Editor
        height="100%"
        defaultLanguage={language}
        value={fileContent}
        onChange={(value) => setFileContent(selectedFile, value || "")}
        theme="vs-dark"
        onMount={(editor) => (editorRef.current = editor)}
      />
    </div>
  );
};

export default EditorPanel;
