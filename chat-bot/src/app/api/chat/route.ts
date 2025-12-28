import { NextRequest, NextResponse } from "next/server";
import { Ollama } from "ollama";
import { buildWebRagContext } from "@/lib/rag/web-rag";

// Initialize Ollama client
const ollamaHost = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";
const ollama = new Ollama({ host: ollamaHost });

type IncomingMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      messages?: IncomingMessage[];
      model?: string;
      enableWeb?: boolean;
    };

    const messages = Array.isArray(body.messages) ? body.messages : [];
    const model = typeof body.model === "string" ? body.model : undefined;
    const enableWeb = Boolean(body.enableWeb);

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
          const finalMessages = messages.map((m) => ({
            role: m.role,
            content: m.content,
          }));

          const systemBlocks: string[] = [];

          // Qwen: keep your original <think> behavior, but ensure citations appear in the final answer.
          if (selectedModel.toLowerCase().includes("qwen")) {
            systemBlocks.push(
              [
                "You are a helpful AI assistant.",
                "Please think step-by-step before answering the user's request.",
                "Enclose your thinking process within <think> and </think> tags, then provide your final answer.",
                "IMPORTANT: Any citations and the Sources section must appear in the final answer (outside <think>).",
              ].join(" ")
            );
          }

          // Web RAG (Tavily + LlamaIndex), gated by request flag or env default.
          const webEnabled =
            Boolean(enableWeb) || process.env.RAG_ENABLE_WEB === "1";

          if (webEnabled) {
            try {
              const rag = await buildWebRagContext(String(lastMessage.content ?? ""));
              if (rag?.context) {
                systemBlocks.push(
                  [
                    "You have access to WEB_EVIDENCE and SOURCES below.",
                    "Use WEB_EVIDENCE as the primary factual basis when it is relevant.",
                    "When you use evidence, cite it inline using [n] where n matches the source id.",
                    "At the end of your final answer, add a 'Sources' section with the sources you cited.",
                    "Do not invent sources. If evidence is insufficient, say so.",
                    "",
                    rag.context,
                  ].join("\n")
                );
              }
            } catch (err) {
              console.warn("[web-rag] failed, fallback to normal chat:", err);
            }
          }

          if (systemBlocks.length) {
            const merged = systemBlocks.join("\n\n");
            if (finalMessages.length > 0 && finalMessages[0].role === "system") {
              finalMessages[0].content = `${finalMessages[0].content}\n\n${merged}`;
            } else {
              finalMessages.unshift({ role: "system", content: merged });
            }
          }

          const response = await ollama.chat({
            model: selectedModel, 
            messages: finalMessages,
            stream: true,
            keep_alive: "1h", // Keep model in memory for 1 hour
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
