import { create } from "zustand";
import { nanoid } from "nanoid";
import IndexedDB from "@/lib/indexedDB"; // Import the IndexedDB service

const indexedDBService = new IndexedDB("playground", "active");

interface ActiveState {
  projectId: string;
  name: string;
  email: string;
  newProject: () => string;
  setName: (name: string) => void;
  lastPublish: string;
  error: string;
  setError: (error: string) => void;
  files: string[];
  selectedFile: string;
  setSelectedFile: (file: string) => void;
  fileContents: Record<string, string>;
  setFileContent: (file: string, content: string) => void;
  preview: string;
  triggerPreview: () => void;
  uploadFiles: (image: string) => Promise<{ success: boolean; url?: string }>;
  loadFileContents: (id: string) => Promise<void>;
  cloneProject: () => void;
}

const initFileContents = {
  "index.html": `<canvas id="canvas" tabindex="0" style:"width:100%; height:100%; border:1px solid;"></canvas>`,
  "style.css":
    "html{ width:100%; height:100%; background-color: #333; color:  #f0f0f0; margin:0px; padding:0px; display:flex; flex-direction:column;} canvas { flex:1; margin:5px; }",
  "script.js": 'console.log("Hello, World!");',
};

export const useActiveStore = create<ActiveState>((set, get) => ({
  projectId: "",
  email: "",
  name: "New Project",
  newProject: () => {
    const projectId = nanoid(20);
    const newState = {
      projectId,
      name: "New Project",
      lastPublish: "",
      fileContents: initFileContents,
      email: "",
      preview: composePreview(initFileContents, projectId),
      error: "",
    };
    set(newState);
    indexedDBService.saveState(newState); // Save to IndexedDB
    return projectId;
  },
  setName: (name) => {
    set((state) => {
      const newState = { ...state, name: name };
      indexedDBService.saveState(newState); // Save to IndexedDB
      return newState;
    });
  },
  lastPublish: "",
  error: "",
  setError: (error) => {
    set((state) => {
      const newState = { ...state, error };
      return newState;
    });
  },
  files: ["index.html", "style.css", "script.js"],
  selectedFile: "index.html",
  setSelectedFile: (file: string) => {
    set((state) => {
      const newState = { ...state, selectedFile: file };
      return newState;
    });
  },
  fileContents: initFileContents,
  setFileContent: (file: string, content: string) => {
    set((state) => {
      const newFileContents = { ...state.fileContents, [file]: content };
      const newState = { ...state, fileContents: newFileContents };
      indexedDBService.saveState(newState); // Save to IndexedDB
      return newState;
    });
  },
  preview: "",
  triggerPreview: () => {
    set((state) => {
      const preview = composePreview(state.fileContents, state.projectId);
      const newState = { ...state, preview };
      return newState;
    });
  },
  uploadFiles: async (image: string) => {
    const { projectId, fileContents: content, name } = get();
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

      if (!response.ok) {
        set({ error: "Failed to upload files" });
        const error = await response.json();
        console.error("Failed to upload files:", error);
        return { success: false, error: error.message || "Upload failed" };
      }

      console.log("Files uploaded successfully");
      set({ error: "", lastPublish: new Date().toLocaleString() });
      return { success: true, url: `${location.origin}/view/${projectId}` };
    } catch (err) {
      set({ error: "Failed to upload files" });
      console.error("Error uploading files:", err);
      return { success: false, error: "An unexpected error occurred" };
    }
  },
  loadFileContents: async (id: string) => {
    const loadedState = await loadProject(id);
    if (loadedState) {
      set(loadedState);
    }
  },
  cloneProject: () => {
    const projectId = nanoid(20);
    const newState = { projectId, name: "New Project", lastPublish: "" };
    set(newState);
    indexedDBService.saveState(newState); // Save to IndexedDB
  },
}));

const loadProject = async (id: string) => {
  try {
    const response = await fetch(
      `https://storage.yandexcloud.net/playground-yat/${id}`
    );

    if (response.ok) {
      const { content, email, name = "" } = await response.json();
      return {
        fileContents: content,
        projectId: id,
        email,
        name,
        error: "",
        lastPublish: "",
        preview: composePreview(content, id),
      };
    } else {
      console.error("Failed to load file contents:", response.statusText);
    }
  } catch (err) {
    console.error("Error loading file contents:", err);
  }
};

const init = async () => {
  let id = "";
  await indexedDBService.initDB();
  const paths = window.location.pathname.split("/");
  if (paths.length > 2 && paths[1] === "view") {
    id = paths[2];
    const loadedState = await loadProject(id);
    if (loadedState) {
      useActiveStore.setState(loadedState);
    }
    return;
  }

  const savedState = await indexedDBService.loadState();
  if (paths.length > 2 && savedState?.projectId !== paths[2]) {
    id = paths[2];
    const loadedState = await loadProject(id);
    if (loadedState) {
      return useActiveStore.setState(loadedState);
    }
    return useActiveStore.setState({
      ...useActiveStore.getInitialState(),
      projectId: id,
    });
  }

  if (savedState) {
    useActiveStore.setState(savedState);
  }
};

const composePreview = (
  fileContents: Record<string, string>,
  projectId: string
) => {
  const htmlContent = fileContents["index.html"] || "";
  const cssContent = fileContents["style.css"] || "";
  const jsContent = fileContents["script.js"] || "";

  return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Preview</title>
            <style>${cssContent}</style>
        </head>
        <body>
            ${htmlContent}
            <script>
              (function() {
                const projectId = '${projectId || ""}';
                // Override console.log to post messages to the parent window
                const originalLog = console.log;
                console.log = function(...args) {
                    window.parent.postMessage({ type: 'console', message: args.join(' ') }, '*');
                    originalLog.apply(console, args);
                };
                //wrap mouse events and propagate to parent window
                document.addEventListener('mousemove', (event) => {
                  window.parent.postMessage({ type: 'mousemove', event: { clientX: event.clientX, clientY: event.clientY } }, '*');
                });
                document.addEventListener('mouseup', (event) => {
                  window.parent.postMessage({ type: 'mouseup', event: { clientX: event.clientX, clientY: event.clientY } }, '*');
                });
                ${jsContent}
              })();
            </script>
        </body>
        </html>
      `;
};

init();
