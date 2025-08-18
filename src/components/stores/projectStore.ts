import { createStore } from "zustand/vanilla";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { Content, ProjectDto } from "@/dto/project.dto";
import { composePreview } from "@/lib/actions/preview";

const PUBLIC_APP_URL = "https://app.js2go.ru";

export type ProjectActions = {
  newProject: () => string;
  setName: (name: string) => void;
  setError: (error: string) => void;
  setSelectedFile: (file: keyof Content) => void;
  setFileContent: (file: string, content: string) => void;
  setContent: (data: Content) => void;
  getPreview: () => string;
  triggerPreview: () => void;
  uploadFiles: (
    projectId: string,
    image: string,
  ) => Promise<{ success: boolean; url?: string }>;
  cloneProject: (email: string) => void;
};

export type ProjectStore = ProjectDto & ProjectActions;

const initFileContents: Content = {
  "index.html": `<canvas id="canvas" tabindex="0" style:"width:100%; height:100%; border:1px solid;"></canvas>`,
  "style.css":
    "html{ width:100%; height:100%; background-color: #333; color:  #f0f0f0; margin:0px; padding:0px; display:flex; flex-direction:column;} canvas { flex:1; margin:5px; }",
  "script.js": 'console.log("Hello, World!");',
};

export const initProjectStore = (): ProjectDto => {
  return {
    projectId: "",
    isMy: true,
    hasAi: false,
    email: "",
    name: "New Project",
    lastPublish: "",
    error: "",
    isLoading: false,
    selectedFile: "index.html",
    fileContents: initFileContents,
    preview: "",
  };
};

export const defaultInitState: ProjectDto = {
  projectId: "",
  email: "",
  isMy: true,
  hasAi: false,
  name: "New Project",
  lastPublish: "",
  error: "",
  isLoading: false,
  selectedFile: "index.html",
  fileContents: initFileContents,
  preview: "",
};

export const createProjectStore = (
  initState: ProjectDto = defaultInitState,
) => {
  return createStore<ProjectStore>()((set, get) => ({
    ...initState,
    newProject: () => {
      const projectId = nanoid(20);

      set((state) => {
        const newState = {
          ...state,
          projectId,
          email: "",
          name: "New Project",
          lastPublish: "",
          fileContents: initFileContents,
          preview: composePreview(initFileContents, projectId),
          error: "",
        };
        // indexedDBService.saveState(newState); // Save to IndexedDB
        return newState;
      });
      return projectId;
    },
    setName: (name) => {
      set((state) => {
        const newState = { ...state, name };
        // indexedDBService.saveState(newState); // Save to IndexedDB
        return newState;
      });
    },
    setError: (error) => {
      set((state) => {
        const newState = { ...state, error };
        return newState;
      });
    },
    setSelectedFile: (file: keyof Content) => {
      set((state) => {
        console.log("-", file);
        const newState = { ...state, selectedFile: file };
        return newState;
      });
    },
    setFileContent: (file: string, content: string) => {
      set((state) => {
        const newFileContents = { ...state.fileContents, [file]: content };
        const newState = { ...state, fileContents: newFileContents };
        // indexedDBService.saveState(newState); // Save to IndexedDB
        return newState;
      });
    },
    setContent: (data: Content) => {
      set((state) => {
        const newFileContents = { ...state.fileContents, ...data };
        const newState = { ...state, fileContents: newFileContents };
        // indexedDBService.saveState(newState); // Save to IndexedDB
        return newState;
      });
    },
    getPreview: () => {
      const { fileContents, projectId } = get();
      const preview = composePreview(fileContents, projectId);
      return preview;
    },
    triggerPreview: () => {
      const { fileContents, projectId } = get();
      set({ preview: composePreview(fileContents, projectId) });
    },
    uploadFiles: async (projectId: string, image: string) => {
      const { fileContents: content, name } = get();
      set({ isLoading: true });
      try {
        const response = await fetch("/api/project/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            projectId,
            name,
            content,
            image,
          }),
        });

        if (response.ok) {
          toast.success("Project is uploaded successfully");
          set({
            error: "",
            lastPublish: new Date().toLocaleString(),
            isLoading: false,
          });
          return { success: true, url: `${PUBLIC_APP_URL}/${projectId}.html` };
        }

        toast.error(`Failed to upload files: ${response.statusText}`);
      } catch (err) {
        toast.error(`Error uploading files: ${err}`);
      }
      // error case
      set({ error: "Failed to upload files", isLoading: false });
      return { success: false, error: "Upload failed" };
    },
    cloneProject: (email: string) => {
      const projectId = nanoid(20);
      const newState = {
        projectId,
        name: "New Project",
        lastPublish: "",
        email,
        error: "",
      };
      set(newState);
      // indexedDBService.saveState(newState); // Save to IndexedDB
    },
  }));
};
