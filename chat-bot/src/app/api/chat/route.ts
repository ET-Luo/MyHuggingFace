import { NextRequest, NextResponse } from "next/server";
import { Ollama } from "ollama";

// Initialize Ollama client
const ollama = new Ollama({ host: "http://127.0.0.1:11434" });

export async function POST(req: NextRequest) {
  try {
    const { messages, model } = await req.json();

    // Get the last message from the user
    const lastMessage = messages[messages.length - 1];

    if (!lastMessage) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    // Create a stream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const selectedModel = model || "qwen3:4b";

          // Prepare messages
          let finalMessages = messages.map((m: any) => ({
            role: m.role,
            content: m.content,
          }));

          // Inject System Prompt for Qwen models (or if requested) to force thinking process
          if (selectedModel.toLowerCase().includes("qwen")) {
            const systemPrompt = "You are a helpful AI assistant. Please think step-by-step before answering the user's request. Enclose your thinking process within <think> and </think> tags, then provide your final answer.";
            
            // Check if there is already a system message at the start
            if (finalMessages.length > 0 && finalMessages[0].role === 'system') {
               finalMessages[0].content += `\n\n${systemPrompt}`;
            } else {
               finalMessages.unshift({ role: 'system', content: systemPrompt });
            }
          }

          const response = await ollama.chat({
            model: selectedModel, 
            messages: finalMessages,
            stream: true,
          }).catch(err => {
            throw new Error(`Ollama Error: ${err.message || 'Failed to connect to Ollama'}`);
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
        "X-Accel-Buffering": "no",
        "Cache-Control": "no-cache, no-transform",
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
