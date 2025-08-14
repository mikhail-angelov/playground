import OpenAI from "openai";
import { User, Api } from "../models/User";

const BASE_URLS: Record<string, string> = {
  deepseek: "https://api.deepseek.com",
  openai: "https://api.openai.com/v1",
  yandex: "https://llm.api.cloud.yandex.net/v1",
};
const MODELS: Record<string, string> = {
  deepseek: "deepseek-chat",
  openai: "gpt-4o",
  yandex: "gpt://b1gimvlm8a6gf8q18keq/yandexgpt/latest",
};

const getAi = (api: Api) => {
  const openai = new OpenAI({
    baseURL: BASE_URLS[api.provider] || BASE_URLS.deepseek,
    apiKey: api.key,
  });
  return openai;
};

export const aiService = {
  async makeRequest(request: any): Promise<any> {
    const user = await User.findOne({ where: { id: request.userId } });
    if (!user || !user.api?.key) {
      throw new Error("User not found");
    }
    const openai = getAi(user.api);

    const stream = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant. make response with separation html, css, js code",
        },
        { role: "user", content: request.prompt },
      ],
      model: MODELS[user.api.provider] || "deepseek-chat",
      stream: true,
    });

    return stream;
  },
};
