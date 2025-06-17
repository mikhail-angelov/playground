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

const AiPanel: React.FC = () => {
  const isLoading = useAiStore((state) => state.isLoading);
  const response = useAiStore((state) => state.response);
  const requestAi = useAiStore((state) => state.requestAi);
  const [text, setText] = React.useState("");
  const markdownRef = React.useRef<HTMLDivElement>(null);

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
                return !className ? (
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
                ) : (
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
          <Button className="m-2" onClick={handleRequestAi}>
            <SparklesIcon className="w-6 h-6" />
          </Button>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};

export default AiPanel;
