import React from "react";
import { Button } from "@/components/ui/button";
import { SparklesIcon } from "lucide-react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import ReactMarkdown from "react-markdown";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { useProjectStore } from "@/components/providers/ProjectStoreProvider";
import { useAiStore } from "@/components/stores/useAi";
import { Content } from "@/dto/project.dto";

const AiPanel: React.FC = () => {
  const { setContent } = useProjectStore((state) => state);
  const isLoading = useAiStore((state) => state.isLoading);
  const response = useAiStore((state) => state.response);
  const requestAi = useAiStore((state) => state.requestAi);
  const clearHistory = useAiStore((state) => state.clearHistory);
  const history = useAiStore((state) => state.history);
  const [text, setText] = React.useState("");
  const [historyIndex, setHistoryIndex] = React.useState<number | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const markdownRef = React.useRef<HTMLDivElement>(null);

  const codeSummary: Partial<Content> = {};

  const collectCode = (className: string, code: string, isLatest: boolean) => {
    if (isLoading || !isLatest) return;
    const lowerClass = className.toLowerCase();
    
    if (lowerClass.includes("html")) {
      codeSummary["index.html"] = code;
    } else if (lowerClass.includes("css")) {
      codeSummary["style.css"] = code;
    } else if (lowerClass.includes("javascript") || lowerClass.includes("js")) {
      codeSummary["script.js"] = code;
    }
  };
  const copyCodeToProject = () => {
    if (Object.keys(codeSummary).length === 0) {
      toast.error("No code to copy");
      return;
    }
    // Only pass keys that were actually collected
    setContent(codeSummary as Content);
    toast.success("Code patched into project");
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
    setHistoryIndex(null);
  };

  // Copy code to clipboard helper
  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Copied to clipboard");
  };

  // Handle Arrow Up for prompt history
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const userPrompts = (history as any[]).filter(m => m.role === 'user').map(m => m.content);
    if (
      e.key === "ArrowUp" &&
      text.trim() === "" &&
      document.activeElement === textareaRef.current &&
      userPrompts.length > 0
    ) {
      e.preventDefault();
      const newIndex =
        historyIndex === null
          ? userPrompts.length - 1
          : Math.max(0, historyIndex - 1);
      setText(userPrompts[newIndex] || "");
      setHistoryIndex(newIndex);
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleRequestAi();
    } else if (e.key === "ArrowDown" && historyIndex !== null) {
      e.preventDefault();
      if (historyIndex < userPrompts.length - 1) {
        const newIndex = historyIndex + 1;
        setText(userPrompts[newIndex] || "");
        setHistoryIndex(newIndex);
      } else {
        setText("");
        setHistoryIndex(null);
      }
    }
  };

  // Reset history index if user types
  React.useEffect(() => {
    const userPrompts = (history as any[]).filter(m => m.role === 'user').map(m => m.content);
    if (text !== (userPrompts[historyIndex ?? -1] || "")) {
      setHistoryIndex(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <ResizablePanelGroup direction="vertical">
      <ResizablePanel className="flex flex-col !overflow-y-auto">
        <div
          ref={markdownRef}
          className="flex-1 p-4 text-gray-300 whitespace-pre-wrap overflow-x-auto"
          style={{ minHeight: 0, height: "100%", overflowY: "auto" }}
        >
          {history.map((msg, i) => (
            <div key={i} className={`mb-6 ${msg.role === 'user' ? 'opacity-80' : ''}`}>
              <div className="text-xs font-bold mb-1 uppercase tracking-wider text-gray-500">
                {msg.role === 'user' ? '👤 User' : '🤖 Vibe Coder'}
              </div>
              <ReactMarkdown
                components={{
                  code({ node, className, children, ...props }) {
                    if (!className) return <code {...props}>{children}</code>;
                    const isLatest = !isLoading && i === history.length - 1 && msg.role === 'assistant';
                    collectCode(className, String(children).trim(), isLatest);
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
                        <pre className="overflow-x-auto rounded bg-[#18181b] p-3 my-2 border border-gray-800">
                          <code className={className} {...props}>{children}</code>
                        </pre>
                      </div>
                    );
                  }
                }}
              >
                {msg.content}
              </ReactMarkdown>
            </div>
          ))}
          
          {isLoading && (
            <div className="mb-6">
              <div className="text-xs font-bold mb-1 uppercase tracking-wider text-blue-500 animate-pulse">
                🪄 Thinking...
              </div>
              <ReactMarkdown
                components={{
                  code({ node, className, children, ...props }) {
                    if (!className) return <code {...props}>{children}</code>;
                    collectCode(className, String(children).trim(), true);
                    return (
                      <div className="relative group">
                        <pre className="overflow-x-auto rounded bg-[#18181b] p-3 my-2 border border-blue-900/30">
                          <code className={className} {...props}>{children}</code>
                        </pre>
                      </div>
                    );
                  }
                }}
              >
                {response}
              </ReactMarkdown>
            </div>
          )}

          {!isLoading && history.length === 0 && (
            <div className="h-full flex items-center justify-center text-gray-500 italic">
              What application do you want to build?
            </div>
          )}
        </div>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={10}>
        <div className="flex overflow-y-auto">
          <textarea
            ref={textareaRef}
            className="w-full h-full p-2 bg-gray-900 text-white"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              isLoading ? "Processing..." : "Describe your application idea..."
            }
            rows={3}
            autoFocus
            onKeyDown={handleKeyDown}
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
            title="Patch generated code to project"
          >
            <Copy className="w-6 h-6" />
          </Button>
          <Button
            className="m-2 bg-red-900/20 hover:bg-red-900/40 text-red-500 border border-red-900/50"
            onClick={clearHistory}
            disabled={isLoading}
            title="Clear history and start new session"
          >
            <SparklesIcon className="w-6 h-6 rotate-180" />
          </Button>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};

export default AiPanel;
