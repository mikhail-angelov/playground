export interface Content {
  "index.html": string;
  "style.css": string;
  "script.js": string;
}

export const contentFiles = [
  "index.html",
  "style.css",
  "script.js",
] as (keyof Content)[];

export type ProjectDto = {
  isMy: boolean;
  hasAi: boolean;
  projectId: string;
  name: string;
  email: string;
  lastPublish: string;
  isLoading: boolean;
  error: string;
  selectedFile: keyof Content;
  fileContents: Content;
  preview: string;
  tags: string[];
};
