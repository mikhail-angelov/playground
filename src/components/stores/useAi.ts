import { create } from "zustand";
import { toast } from "sonner";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AiState {
  requestAi: (text: string, files?: any) => Promise<void>;
  clearHistory: () => void;
  status: "idle" | "generating" | "completed" | "error";
  error: string;
  response: string;
  history: ChatMessage[];
}

export const useAiStore = create<AiState>((set, get) => ({
  response: "",
  status: "idle",
  error: "",
  history: [],
  clearHistory: () => set({ history: [], response: "", status: "idle", error: "" }),
  requestAi: async (text: string, files?: any) => {
    const { history, status } = get();
    if (status === "generating") return;
    set({
      status: "generating",
      error: "",
      response: "✨ AI magic is processing...",
    });

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        body: JSON.stringify({ 
            prompt: text,
            history,
            files
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Generation failed (HTTP ${response.status}).`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let result = "";
      let pending = "";
      let completed = false;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          pending += decoder.decode(value, { stream: true });
          const lines = pending.split("\n");
          pending = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const { content } = JSON.parse(line.slice(5));
            if (content === "[DONE]") {
              completed = true;
            } else if (typeof content === "string" && !completed) {
              result += content;
            }
          }
          if (result) set({ response: result });
        }
      } finally {
        reader.releaseLock();
      }

      if (!completed) throw new Error("Generation ended before the response was complete.");
      if (!result.trim()) throw new Error("Generation returned no response.");

      set((state) => ({
        status: "completed",
        history: [
            ...state.history,
            { role: "user", content: text },
            { role: "assistant", content: result }
        ]
      }));
    } catch (error) {
      console.error("AI request failed:", error);
      const message = error instanceof Error ? error.message : "Generation failed.";
      set({ status: "error", error: message });
      toast.error(message);
    }
  },
}));
