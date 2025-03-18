import { create } from "zustand";
import { HOST, ORIGIN_HOST } from "./utils";
import { nanoid } from "nanoid";

interface AppState {
  projectId: string;
  projectName: string;
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
  uploadFiles: () => Promise<{ success: boolean; url?: string }>;
  loadFileContents: (id?: string) => Promise<void>;
}

const initFileContents = {
  "index.html": `<canvas id="canvas" style:"width:100%; height:100%; border:1px solid;"></canvas>`,
  "style.css":
    "html{ width:100%; height:100%; background-color: #333; color:  #f0f0f0; margin:0px; padding:0px; display:flex; flex-direction:column;} canvas { flex:1; margin:5px; }",
  "script.js": 'console.log("Hello, World!");',
};

export const useMainStore = create<AppState>((set, get) => ({
  projectId: "",
  projectName: "New Project",
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
      const preview = composePreview(state.fileContents);
      return { preview };
    }),
  uploadFiles: async () => {
    const { projectId, fileContents, projectName } = get();
    try {
      const response = await fetch(`${HOST}/api/files/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          projectId,
          projectName,
          content: fileContents,
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
      return { success: true, url: `${ORIGIN_HOST}/view/${projectId}` };
    } catch (err) {
      set({ error: "Failed to upload files" });
      console.error("Error uploading files:", err);
      return { success: false, error: "An unexpected error occurred" };
    }
  },
  loadFileContents: async (id?: string) => {
    const urlParams = new URLSearchParams(window.location.search);

    if (!id) {
      // Generate a random 20-character string if `id` is not defined
      console.log("Generating new project ID");
      id = nanoid(20);
      urlParams.set("id", id);
      const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
      window.history.replaceState(null, "", newUrl); // Update the URL without reloading
    }
    set({ projectId: id });

    try {
      const response = await fetch(
        `https://storage.yandexcloud.net/playground-yat/${id}`
      );

      if (response.ok) {
        const content = await response.json();
        set({ fileContents: content });
      } else {
        console.error("Failed to load file contents:", response.statusText);
      }
    } catch (err) {
      console.error("Error loading file contents:", err);
    }
  },
}));

const composePreview = (fileContents: Record<string, string>) => {
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
