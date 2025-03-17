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

const initFileContents = {
  "index.html": `<canvas id="canvas" style:"width:100%; height:100%; border:1px solid;"></canvas>`,
  "style.css": "html{ width:100%; height:100%; background-color: #333; color:  #f0f0f0; margin:0px; padding:0px; display:flex; flex-direction:column;} canvas { flex:1; margin:5px; }",
  "script.js": 'console.log("Hello, World!");',
}

export const useMainStore = create<AppState>((set) => ({
  projectName: "New Project",
  setProjectName: (name) => set({ projectName: name }),
  files: ["index.html", "style.css", "script.js"],
  selectedFile: "index.html",
  setSelectedFile: (file: string) => set({ selectedFile: file }),
  fileContents: initFileContents,
  setFileContent: (file: string, content: string) =>
    set((state) => ({
      fileContents: { ...state.fileContents, [file]: content },
    })),
    preview: '',
    triggerPreview: () =>
        set((state) =>{
            const preview = composePreview(state.fileContents);
            return{ preview};
        }),
}));

const composePreview = (fileContents: Record<string, string>) => {
     const htmlContent = fileContents['index.html'] || '';
      const cssContent = fileContents['style.css'] || '';
      const jsContent = fileContents['script.js'] || '';
    
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
}