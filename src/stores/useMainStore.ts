import { create } from "zustand";

interface AppState {
  projectName: string;
  setProjectName: (name: string) => void;
  files: string[];
  selectedFile: string;
  setSelectedFile: (file: string) => void;
  fileContents: Record<string, string>;
  setFileContent: (file: string, content: string) => void;
  preview: string;
  triggerPreview: () => void;
}

export const useMainStore = create<AppState>((set) => ({
  projectName: "New Project",
  setProjectName: (name) => set({ projectName: name }),
  files: ["index.html", "style.css", "script.js"],
  selectedFile: "index.html",
  setSelectedFile: (file: string) => set({ selectedFile: file }),
  fileContents: {
    "index.html": `<div id="test">Hello, World!</div>`,
    "style.css": "body { background-color: #333; color:  #f0f0f0;}",
    "script.js": 'console.log("Hello, World!");',
  },
  setFileContent: (file: string, content: string) =>
    set((state) => ({
      fileContents: { ...state.fileContents, [file]: content },
    })),
    preview: "",
    triggerPreview: () =>
        set((state) =>{
            const preview = composePreview(state);
            return{ preview};
        }),
}));

const composePreview = (state: AppState) => {
     const htmlContent = state.fileContents['index.html'] || '';
      const cssContent = state.fileContents['style.css'] || '';
      const jsContent = state.fileContents['script.js'] || '';
    
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
                const originalLog = console.log;
                console.log = function(...args) {
                    window.parent.postMessage({ type: 'console', message: args.join(' ') }, '*');
                    originalLog.apply(console, args);
                };
                ${jsContent}
              })();
            </script>
        </body>
        </html>
      `;
}