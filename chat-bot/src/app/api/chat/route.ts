import { NextRequest, NextResponse } from "next/server";
import { Ollama } from "ollama";

// Initialize Ollama client
const ollama = new Ollama({ host: "http://127.0.0.1:11434" });

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    // Get the last message from the user
    const lastMessage = messages[messages.length - 1];

    if (!lastMessage) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    // Create a stream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await ollama.chat({
            model: "qwen3:4b", // User specified model
            messages: messages.map((m: any) => ({
              role: m.role,
              content: m.content,
            })),
            stream: true,
          });

          for await (const part of response) {
            const content = part.message.content;
            if (content) {
              controller.enqueue(new TextEncoder().encode(content));
            }
          }
          controller.close();
        } catch (error) {
          console.error("Ollama streaming error:", error);
          controller.error(error);
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("API Route Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

