export interface Content {
  "index.html": string;
  "style.css": string;
  "script.js": string;
}

export type ProjectDto = {
  isMy: boolean;
  hasAi: boolean;
  projectId: string;
  name: string;
  email: string;
  lastPublish: string;
  isLoading: boolean;
  error: string;
  files: string[];
  selectedFile: keyof Content;
  fileContents: Content;
  preview: string;
};
