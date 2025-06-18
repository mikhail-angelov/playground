import React from "react";
import { Button } from "@/components/ui/button";
import { SparklesIcon } from "lucide-react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useAiStore } from "@/stores/useAi";
import ReactMarkdown from "react-markdown";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Content, useActiveStore } from "@/stores/useActiveStore";

const AiPanel: React.FC = () => {
  const setContent = useActiveStore((state) => state.setContent);
  const isLoading = useAiStore((state) => state.isLoading);
  const response = useAiStore((state) => state.response);
  const requestAi = useAiStore((state) => state.requestAi);
  const [text, setText] = React.useState("");
  const markdownRef = React.useRef<HTMLDivElement>(null);

  const codeSummary: Content = {
    "index.html": "",
    "script.js": "",
    "style.css": "",
  };
  const collectCode = (className: string, code: string) => {
    if(isLoading) return;
    if (
      className.includes("language-html") &&
      codeSummary["index.html"].length < code.length
    ) {
      codeSummary["index.html"] += code + "\n";
    } else if (
      className.includes("language-css") &&
      codeSummary["style.css"].length < code.length
    ) {
      codeSummary["style.css"] += code + "\n";
    } else if (
      className.includes("language-javascript") &&
      codeSummary["script.js"].length < code.length
    ) {
      codeSummary["script.js"] += code + "\n";
    }
  };
  const copyCodeToProject = () => {
    if (
      !codeSummary["index.html"] &&
      !codeSummary["style.css"] &&
      !codeSummary["script.js"]
    ) {
      toast.error("No code to copy");
      return;
    }
    setContent(codeSummary);
    toast.success("Code copied to project");
  };

  // Scroll to bottom when response changes
  React.useEffect(() => {
    if (markdownRef.current) {
      markdownRef.current.scrollTop = markdownRef.current.scrollHeight;
    }
  }, [response]);

  const handleRequestAi = () => {
    requestAi(text);
    setText("");
  };

  // Copy code to clipboard helper
  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Copied to clipboard");
  };

  return (
    <ResizablePanelGroup direction="vertical">
      <ResizablePanel className="flex flex-col !overflow-y-auto">
        <div
          ref={markdownRef}
          className="flex-1 p-4 text-gray-300 whitespace-pre-wrap overflow-x-auto"
          style={{ minHeight: 0, height: "100%", overflowY: "auto" }}
        >
          <ReactMarkdown
            components={{
              code({ node, className, children, ...props }) {
                // Only show copy button for code blocks (not inline)
                if (!className) {
                  return (
                    <code
                      className={className}
                      style={{
                        background: "#222",
                        borderRadius: "4px",
                        padding: "2px 4px",
                        fontSize: "90%",
                      }}
                      {...props}
                    >
                      {children}
                    </code>
                  );
                }
                collectCode(className, String(children).trim());
                return (
                  <div className="relative group">
                    <button
                      type="button"
                      className="absolute top-2 left-2 z-10 opacity-70 hover:opacity-100 bg-[#232323] rounded p-1 transition"
                      onClick={() => handleCopy(String(children).trim())}
                      title="Copy to clipboard"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <pre
                      className="overflow-x-auto rounded bg-[#18181b] p-3 my-2"
                      style={{
                        maxWidth: "100%",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-all",
                      }}
                    >
                      <code className={className} {...props}>
                        {children}
                      </code>
                    </pre>
                  </div>
                );
              },
            }}
          >
            {response || "What application do you want to build?"}
          </ReactMarkdown>
        </div>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={10}>
        <div className="flex overflow-y-auto">
          <textarea
            className="w-full h-full p-2 bg-gray-900 text-white"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              isLoading ? "Processing..." : "Describe your application idea..."
            }
            rows={3}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleRequestAi();
              }
            }}
            disabled={isLoading}
            spellCheck="false"
            autoCapitalize="off"
            autoCorrect="off"
            style={{ resize: "none" }}
          />
          <Button
            className="m-2"
            onClick={handleRequestAi}
            disabled={isLoading}
          >
            <SparklesIcon className="w-6 h-6" />
          </Button>
          <Button
            className="m-2"
            onClick={copyCodeToProject}
            disabled={isLoading}
          >
            <Copy className="w-6 h-6" />
          </Button>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};

export default AiPanel;
