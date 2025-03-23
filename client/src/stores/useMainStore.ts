import { create } from "zustand";
import { nanoid } from "nanoid";

interface AppState {
  projectId: string;
  projectName: string;
  email: string;
  newProject: () => string;
  setProjectName: (name: string) => void;
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
  "index.html": `<canvas id="canvas" style:"width:100%; height:100%; border:1px solid;"></canvas>`,
  "style.css":
    "html{ width:100%; height:100%; background-color: #333; color:  #f0f0f0; margin:0px; padding:0px; display:flex; flex-direction:column;} canvas { flex:1; margin:5px; }",
  "script.js": 'console.log("Hello, World!");',
};

export const useMainStore = create<AppState>((set, get) => ({
  projectId: "",
  email: "",
  projectName: "New Project",
  newProject: () => {
    const projectId = nanoid(20);
    set({
      projectId,
      projectName: "New Project",
      lastPublish: "",
      fileContents: initFileContents,
      email: "",
      preview: composePreview(initFileContents, projectId),
      error: "",
    });
    return projectId;
  },
  setProjectName: (name) => set({ projectName: name }),
  lastPublish: "",
  error: "",
  setError: (error) => set({ error }),
  files: ["index.html", "style.css", "script.js"],
  selectedFile: "index.html",
  setSelectedFile: (file: string) => set({ selectedFile: file }),
  fileContents: initFileContents,
  setFileContent: (file: string, content: string) =>
    set((state) => ({
      fileContents: { ...state.fileContents, [file]: content },
    })),
  preview: "",
  triggerPreview: () =>
    set((state) => {
      const preview = composePreview(state.fileContents, state.projectId);
      return { preview };
    }),
  uploadFiles: async (image: string) => {
    const { projectId, fileContents, projectName: name } = get();
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
          content: fileContents,
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
    try {
      const response = await fetch(
        `https://storage.yandexcloud.net/playground-yat/${id}`
      );

      if (response.ok) {
        const { content, email, name = "" } = await response.json();
        set({
          fileContents: content,
          projectId: id,
          email,
          projectName: name,
          error: "",
          lastPublish: "",
          preview: composePreview(content, id),
        });
      } else {
        console.error("Failed to load file contents:", response.statusText);
      }
    } catch (err) {
      console.error("Error loading file contents:", err);
    }
  },
  cloneProject: () => {
    set({ projectId: nanoid(20), projectName: "New Project", lastPublish: "" });
  },
}));

const composePreview = (fileContents: Record<string, string>, projectId: string) => {
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
                const projectId = '${projectId || ''}';
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
