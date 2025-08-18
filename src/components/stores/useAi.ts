import { create } from "zustand";
import { toast } from "sonner"; // Import the toast function

interface AiState {
  requestAi: (text: string) => Promise<void>;
  isLoading: boolean;
  response: string;
  history: string[];
}

export const useAiStore = create<AiState>((set) => ({
  response: "",
  isLoading: false,
  history: [],
  requestAi: async (text: string) => {
    set((state) => ({
      isLoading: true,
      history: [...state.history, text],
      response: "✨ AI magic is processing...",
    }));
    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        body: JSON.stringify({ prompt: text }),
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
        // Each chunk may contain multiple JSON lines, split and parse each
        for (const line of chunk.replaceAll("data:", "").split("\n")) {
          if (!line.trim()) continue;
          try {
            const json = JSON.parse(line);
            if (json?.content) {
              result += json.content;
              set({ response: result });
            }
          } catch (e) {
            // Ignore parse errors for incomplete lines
          }
        }
      }
      console.log("Final result:", result); // Debugging line
      set({ isLoading: false });
    } catch (err) {
      console.error("Error ai request:", err);
      toast.error("Error ai request");
      set({ isLoading: false });
    }
  },
}));
