import OpenAI from "openai";
import { eq } from "drizzle-orm";
import { db, users, getUserApi, ProfileDto } from "../db";

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

const getAi = (api: ProfileDto) => {
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

  // Partial update detection
  const partialPatterns = [
    /\/\/ \.\.\./,
    /\/* \.\.\. *\//,
    /\.\.\. \[.*\]/,
    /\/\/ rest of/i,
    /\* rest of/i
  ];
  
  if (partialPatterns.some(p => p.test(content))) {
    issues.push("Detected partial code snippet (omission comment). Please provide the full file content.");
  }

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
  files?: any;
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

**Refinement Mode**: If you are refining an existing app, you MUST provide the FULL content of any file you modify. DO NOT use comments like "// ... rest of code" or "// ... existing code". If a file is completely unchanged, you may omit it from your response entirely. Always ensure that the files you provide are complete, valid, and ready to be used.

**Semantic HTML IDs**: You MUST assign stable, unique native HTML id attributes to important controls, application regions, and visible results. Use meaningful kebab-case names based on each element's purpose. For repeated items, derive IDs from stable item identifiers. Preserve existing IDs when refining the app. For example, use calculator-display for a calculator result, calculator-digit-7 for its 7 button, and calculator-multiply for its multiplication button.

**Accessible application UI**: Use semantic HTML for landmarks, collections, forms, buttons, links, and results. Label form controls and name important regions and control groups. Give icon-only and symbol-only controls descriptive accessible names that include their visible text or symbol. Prefer native semantics and use ARIA only for real names, relationships, and states. Expose actual progress, success, and errors through appropriate status or alert elements without announcing every incremental update. Preserve existing keyboard behavior, layout, and application logic when refining.

Make sure the designs are "premium" and "wow" the user. Use modern CSS (gradients, glassmorphism, animations).
Inform the user about your logic and decisions before the code blocks.`;
console.log(request.history);
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...(request.files ? [{ role: "system" as const, content: `Current Project Files:\n${Object.entries(request.files).map(([name, content]) => `--- ${name} ---\n${content}`).join('\n\n')}` }] : []),
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
    let needsContinuation = false;

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        currentChunkContent += content;
        fullContent += content;
        yield content;
      }

      const finishReason = chunk.choices[0]?.finish_reason;
      if (finishReason === "length") {
        if (!currentChunkContent.trim()) {
          throw new Error("The provider returned an empty continuation.");
        }
        // Auto-continue logic
        messages.push({ role: "assistant", content: currentChunkContent });
        messages.push({ role: "user", content: "Your output was cut off. Please continue exactly where you left off. Do NOT repeat or wrap in new code blocks if you were in the middle of one." });
        needsContinuation = true;
        break; // Break the inner loop to restart with the new messages
      } else if (finishReason === "stop") {
        finished = true;
      } else if (finishReason === "content_filter") {
        throw new Error("The provider stopped generation.");
      }
    }
    
    if (!finished && !needsContinuation) {
      throw new Error("The provider ended generation without a completion signal.");
    }
  }

  if (!fullContent.trim()) throw new Error("The provider returned no response.");

  // Final validation step
  const isRefinement = !!request.history && request.history.length > 0;
  const issues = validateCode(fullContent, isRefinement);
  if (issues.length > 0) {
    yield `\n\n> [!WARNING]\n> **Validation Issues Found:**\n> - ${issues.join('\n> - ')}\n`;
  } else {
    yield `\n\n> [!NOTE]\n> **Code Validated:** No major syntax issues detected. Ready to roll! 🚀\n`;
  }
}
