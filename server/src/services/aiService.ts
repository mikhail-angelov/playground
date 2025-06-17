import OpenAI from "openai";
import { User, Api } from "../models/User";

const getAi = (api: Api) => {
  // it supports only deepseek for now
  const openai = new OpenAI({
    baseURL: "https://api.deepseek.com",
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
            // "You are a helpful assistant. make response in json format, like {html:'',css:'',js:''}",
            "You are a helpful assistant. make response with separation html, css, js code",
        },
        { role: "user", content: request.prompt },
      ],
      model: "deepseek-chat",
      stream: true,
    });

    return stream;
  },
};
