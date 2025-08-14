import dotenv from "dotenv";
import { User } from "../models/User";
import { aiService } from "./aiService";

dotenv.config();

// Mock dependencies
jest.mock("../models/User");

describe("aiService", () => {
  const mockEmail = "user@example.com";
  const mockUserId = "123";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("makeRequest", async () => {
    (User.findOne as jest.Mock).mockResolvedValue({
      id: mockUserId,
      email: mockEmail,
      api: { key: process.env.TEST_DS_KEY, provider: "deepseek" },
    });

    const stream = await aiService.makeRequest({
      userId: mockUserId,
      prompt: "Make pure html js css code for todo list app",
    });

    let hasChunk = false;
    let collector = "";
    for await (const chunk of stream) {
      hasChunk = true;
      console.log("chunk", JSON.stringify(chunk, null, 2));
      // Optionally: check chunk structure
      expect(chunk).toHaveProperty("choices");
      collector += chunk.choices[0].delta.content;
    }
    console.log("collector", collector);

    expect(hasChunk).toBe(true);
  }, 200000);
});
