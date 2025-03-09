import React from 'react';
import Editor from '@monaco-editor/react';
import { useMainStore } from '../stores/useMainStore';

const getLanguageFromExtension = (fileName: string) => {
  const extension = fileName.split('.').pop();
  switch (extension) {
    case 'html':
      return 'html';
    case 'js':
      return 'javascript';
    case 'ts':
      return 'typescript';
    case 'css':
      return 'css';
    default:
      return 'plaintext';
  }
};

const EditorPanel: React.FC = () => {
  const selectedFile = useMainStore((state) => state.selectedFile);
  const fileContent = useMainStore((state) => state.fileContents[selectedFile]);
  const setFileContent = useMainStore((state) => state.setFileContent);

  const language = getLanguageFromExtension(selectedFile);

  return (
    <div className="flex-grow p-4">
      <Editor
        height="100%"
        defaultLanguage={language}
        value={fileContent}
        onChange={(value) => setFileContent(selectedFile, value || '')}
        theme="vs-dark" 
      />
    </div>
  );
};

export default EditorPanel;