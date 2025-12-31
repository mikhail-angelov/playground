import OpenAI from "openai";
import { eq } from "drizzle-orm";
import { db, users, getUserApi, Api } from "../db";

const BASE_URLS: Record<string, string> = {
  deepseek: process.env.AI_BASE_URL_DEEPSEEK || "https://api.deepseek.com",
  openai: process.env.AI_BASE_URL_OPENAI || "https://api.openai.com/v1",
  yandex:
    process.env.AI_BASE_URL_YANDEX ||
    "https://llm.api.cloud.yandex.net/v1",
};
const MODELS: Record<string, string> = {
  deepseek: process.env.AI_MODEL_DEEPSEEK || "deepseek-chat",
  openai: process.env.AI_MODEL_OPENAI || "gpt-4o",
  yandex:
    process.env.AI_MODEL_YANDEX ||
    "gpt://b1gimvlm8a6gf8q18keq/yandexgpt/latest",
};

const getAi = (api: Api) => {
  const openai = new OpenAI({
    baseURL: BASE_URLS.deepseek, // Default to Deepseek
    apiKey: api.key,
  });
  if (api.provider === 'deepseek') {
      openai.baseURL = BASE_URLS.deepseek;
  } else if (api.provider === 'openai') {
      openai.baseURL = BASE_URLS.openai;
  }
  return openai;
};

function extractCode(content: string, language: string): string {
  const regex = new RegExp(`\`\`\`${language}:[\\s\\S]*?\\n([\\s\\S]*?)\`\`\``, 'g');
  const matches = [...content.matchAll(regex)];
  return matches.map(m => m[1]).join('\n');
}

function validateCode(content: string, isRefinement: boolean): string[] {
  const issues: string[] = [];
  const html = extractCode(content, 'html');
  const css = extractCode(content, 'css');
  const js = extractCode(content, 'js');

  if (!isRefinement && !html && !content.includes('index.html')) issues.push("Missing HTML structure");
  if (html && !html.includes('<!DOCTYPE html>') && !html.includes('<html')) issues.push("HTML might be incomplete");
  
  // Basic bracket matching
  const checkBrackets = (str: string) => {
    let count = 0;
    for (const char of str) {
      if (char === '{') count++;
      if (char === '}') count--;
    }
    return count === 0;
  };

  if (css && !checkBrackets(css)) issues.push("CSS has unmatched brackets");
  if (js && !checkBrackets(js)) issues.push("JS has unmatched brackets");

  return issues;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function* makeAiRequest(request: {
  userId: number;
  prompt: string;
  history?: ChatMessage[];
}): AsyncGenerator<string> {
  const user = db
    .select()
    .from(users)
    .where(eq(users.id, request.userId))
    .get();

  if (!user || !user.api) {
    throw new Error("User not found");
  }
  const api = getUserApi(user);
  if (!api) {
    throw new Error("User has no api");
  }

  const openai = getAi(api);

  const systemPrompt = `You are a Vibe Coder Agent. Your goal is to build high-quality, modern, and beautiful web applications.
Follow these steps:
1. **Plan**: Analyze the user request and describe your technical plan.
2. **Implementation**: Generate the full code or partial updates for the application.

Use ONLY these file blocks:
- \`\`\`html:index.html
- \`\`\`css:style.css
- \`\`\`js:script.js

**Refinement Mode**: If you are refining an existing app, you ONLY need to output the files that changed. If a file is unchanged, you don't need to include it in your response.

Make sure the designs are "premium" and "wow" the user. Use modern CSS (gradients, glassmorphism, animations).
Inform the user about your logic and decisions before the code blocks.`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...(request.history || []),
    { role: "user", content: request.prompt },
  ];

  let fullContent = "";
  let finished = false;

  while (!finished) {
    const stream = await openai.chat.completions.create({
      messages: messages as any,
      model: MODELS[api.provider] || "deepseek-chat",
      stream: true,
    });

    let currentChunkContent = "";

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        currentChunkContent += content;
        fullContent += content;
        yield content;
      }

      const finishReason = chunk.choices[0]?.finish_reason;
      if (finishReason === "length") {
        // Auto-continue logic
        messages.push({ role: "assistant", content: currentChunkContent });
        messages.push({ role: "user", content: "Your output was cut off. Please continue exactly where you left off. Do NOT repeat or wrap in new code blocks if you were in the middle of one." });
        break; // Break the inner loop to restart with the new messages
      } else if (finishReason === "stop" || finishReason === "content_filter") {
        finished = true;
      }
    }
    
    // If we finished the loop without a length trigger, we are done
    if (!finished && currentChunkContent === "") {
        finished = true; // Safety break
    }
  }

  // Final validation step
  const isRefinement = !!request.history && request.history.length > 0;
  const issues = validateCode(fullContent, isRefinement);
  if (issues.length > 0) {
    yield `\n\n> [!WARNING]\n> **Validation Issues Found:**\n> - ${issues.join('\n> - ')}\n`;
  } else {
    yield `\n\n> [!NOTE]\n> **Code Validated:** No major syntax issues detected. Ready to roll! 🚀\n`;
  }
}
