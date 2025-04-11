import { create } from "zustand";
import { nanoid } from "nanoid";
import IndexedDB, { STORE_ID } from "@/lib/indexedDB"; // Import the IndexedDB service
import { useAuthStore } from "@/stores/useAuthStore"; // Import useAuthStore

const indexedDBService = new IndexedDB("playground", "active");

const PUBLIC_APP_URL = "https://app.js2go.ru";

interface ActiveState {
  id: string;
  projectId: string;
  name: string;
  email: string;
  newProject: () => string;
  setName: (name: string) => void;
  lastPublish: string;
  isLoading: boolean;
  error: string;
  setError: (error: string) => void;
  files: string[];
  selectedFile: string;
  setSelectedFile: (file: string) => void;
  fileContents: Record<string, string>;
  setFileContent: (file: string, content: string) => void;
  preview: string;
  getPreview: () => string;
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
  id: STORE_ID,
  projectId: "",
  email: "",
  name: "New Project",
  newProject: () => {
    const projectId = nanoid(20);
    const authEmail = useAuthStore.getState().email; // Get email from useAuthStore

    set((state) => {
      const newState = {
        ...state,
        projectId,
        email: authEmail || "",
        name: "New Project",
        lastPublish: "",
        fileContents: initFileContents,
        preview: composePreview(initFileContents, projectId),
        error: "",
      };
      indexedDBService.saveState(newState); // Save to IndexedDB
      return newState;
    });
    return projectId;
  },
  setName: (name) => {
    set((state) => {
      const newState = { ...state, name };
      indexedDBService.saveState(newState); // Save to IndexedDB
      return newState;
    });
  },
  lastPublish: "",
  error: "",
  isLoading: false,
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
  getPreview: () => {
    const { fileContents, projectId } = get();
    const preview = composePreview(fileContents, projectId);
    return preview;
  },
  triggerPreview: () => {
    const { fileContents, projectId } = get();
    set({ preview: composePreview(fileContents, projectId) });
  },
  uploadFiles: async (image: string) => {
    const { projectId, fileContents: content, name } = get();
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
        console.log("Files uploaded successfully");
        set({
          error: "",
          lastPublish: new Date().toLocaleString(),
          isLoading: false,
        });
        return { success: true, url: `${PUBLIC_APP_URL}/${projectId}.html` };
      }

      console.error("Failed to upload files:", response.statusText);
    } catch (err) {
      console.error("Error uploading files:", err);
    }
    // error case
    set({ error: "Failed to upload files", isLoading: false });
    return { success: false, error: "Upload failed" };
  },
  loadFileContents: async (id: string) => {
    const loadedState = await loadProject(id);
    if (loadedState) {
      set(loadedState);
    }
  },
  cloneProject: () => {
    const projectId = nanoid(20);
    const authEmail = useAuthStore.getState().email;
    const newState = {
      projectId,
      name: "New Project",
      lastPublish: "",
      email: authEmail || "",
      error: "",
    };
    set(newState);
    indexedDBService.saveState(newState); // Save to IndexedDB
  },
}));

const loadProject = async (id: string) => {
  try {
    const response = await fetch(`${PUBLIC_APP_URL}/${id}`);

    if (response.ok) {
      const { content, email, name = "" } = await response.json();
      return {
        id: STORE_ID,
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
  const savedState = await indexedDBService.loadState();
  const paths = window.location.pathname.split("/");
  id = paths[2];
  console.log("init", id);
  if (paths.length > 2 && savedState?.projectId === id) {
    // If the saved state matches the URL path, use it
    // This allows the user to continue from where they left off
    useActiveStore.setState(savedState);
    return;
  }

  if (paths.length > 2 && id) {
    const loadedState = await loadProject(id);
    if (!loadedState && paths[1] === "view") {
      // redirect to home if the project cannot be loaded
      // This handles the case when a user tries to access a non-existing project
      window.location.href = "/"; // Redirect to home if the project cannot be loaded
      console.error("Project not found, redirecting to home.");
      return;
    }
    const newState = loadedState
      ? loadedState
      : {
          ...useActiveStore.getInitialState(), // Fallback to initial state if loading fails
          projectId: id, // Ensure projectId is set
        };
    useActiveStore.setState(newState);
    indexedDBService.saveState(newState); // Save to IndexedDB
    return;
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
