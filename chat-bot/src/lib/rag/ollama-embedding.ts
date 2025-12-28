import { BaseEmbedding } from "llamaindex"

type OllamaEmbeddingOptions = {
  host?: string
  model: string
  timeoutMs?: number
}

/**
 * Minimal LlamaIndex embedding adapter backed by Ollama's embeddings endpoint.
 * Uses: POST {host}/api/embeddings  body: { model, prompt }
 */
export class OllamaEmbedding extends BaseEmbedding {
  private host: string
  private model: string
  private timeoutMs: number

  constructor(opts: OllamaEmbeddingOptions) {
    super()
    this.host = (opts.host ?? "http://127.0.0.1:11434").replace(/\/$/, "")
    this.model = opts.model
    this.timeoutMs = opts.timeoutMs ?? 12_000
  }

  async getTextEmbedding(text: string): Promise<number[]> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      const res = await fetch(`${this.host}/api/embeddings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: this.model, prompt: text }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const body = await res.text().catch(() => "")
        throw new Error(`Ollama embeddings failed (${res.status}): ${body}`)
      }

      const data = (await res.json()) as { embedding?: number[] }
      if (!data?.embedding?.length) {
        throw new Error("Ollama embeddings returned empty embedding")
      }
      return data.embedding
    } finally {
      clearTimeout(timer)
    }
  }
}


