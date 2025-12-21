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
    baseURL: BASE_URLS[api.provider] || BASE_URLS.deepseek,
    apiKey: api.key,
  });
  return openai;
};

export async function makeAiRequest(request: {userId:number, prompt:string}): Promise<any> {
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

  const stream = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content:
          "You are a helpful assistant. make response with separation html, css, js code",
      },
      { role: "user", content: request.prompt },
    ],
    model: MODELS[api.provider] || "deepseek-chat",
    stream: true,
  });

  return stream;
}
