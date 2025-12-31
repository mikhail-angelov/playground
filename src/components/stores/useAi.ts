import { create } from "zustand";
import { toast } from "sonner"; // Import the toast function

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AiState {
  requestAi: (text: string) => Promise<void>;
  clearHistory: () => void;
  isLoading: boolean;
  response: string;
  history: ChatMessage[];
}

export const useAiStore = create<AiState>((set, get) => ({
  response: "",
  isLoading: false,
  history: [],
  clearHistory: () => set({ history: [], response: "" }),
  requestAi: async (text: string) => {
    const currentHistory = get().history;
    set((state) => ({
      isLoading: true,
      response: "✨ AI magic is processing...",
    }));

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        body: JSON.stringify({ 
            prompt: text,
            history: currentHistory
        }),
      });

      if (!response.ok || !response.body) {
        console.error("Failed to ai request:", response.statusText);
        toast.error(`Failed to ai request: ${response.statusText}`);
        set({ isLoading: false });
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let result = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.replaceAll("data:", "").split("\n")) {
          if (!line.trim()) continue;
          try {
            const json = JSON.parse(line);
            if (json?.content) {
              if (json.content === "[DONE]") continue;
              if (result === "✨ AI magic is processing...") result = "";
              result += json.content;
              set({ response: result });
            }
          } catch (e) {
            // Ignore parse errors for incomplete lines
          }
        }
      }
      
      set((state) => ({ 
        isLoading: false,
        history: [
            ...state.history,
            { role: "user", content: text },
            { role: "assistant", content: result }
        ]
      }));
    } catch (err) {
      console.error("Error ai request:", err);
      toast.error("Error ai request");
      set({ isLoading: false });
    }
  },
}));
