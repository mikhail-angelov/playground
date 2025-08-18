import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuthUser, AUTH_COOKIE } from "@/services/authService";
import { makeAiRequest } from "@/services/aiService";

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE)?.value;
    const user = await getAuthUser(token);

    const chatStream = await makeAiRequest({ userId: user.id, prompt });

    const encoder = new TextEncoder();
    const ts = new TransformStream();
    const writer = ts.writable.getWriter();

    (async () => {
      try {
        for await (const chunk of chatStream) {
          const content = chunk.choices[0].delta.content;
          if (content) {
            await writer.write(
              encoder.encode(`data: ${JSON.stringify({ content })}\n\n`),
            );
          }
        }
        await writer.write(encoder.encode('data: {"content":"[DONE]"}\n\n'));
      } catch (error) {
        console.error("Error streaming events:", error);
      } finally {
        writer.close();
      }
    })();

    return new NextResponse(ts.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error:", error);
    // Handle error appropriately
  }
}
