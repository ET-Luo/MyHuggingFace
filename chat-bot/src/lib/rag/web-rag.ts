import { TavilyClient } from "tavily"
import { Document, MetadataMode, Settings, VectorStoreIndex } from "llamaindex"
import { OllamaEmbedding } from "./ollama-embedding"

export type WebRagSource = {
  id: number
  title: string
  url: string
  score?: string
}

export type WebRagResult = {
  context: string
  sources: WebRagSource[]
}

function toInt(value: string | undefined, fallback: number) {
  const n = Number.parseInt(value ?? "", 10)
  return Number.isFinite(n) ? n : fallback
}

function normalizeWhitespace(s: string) {
  return s.replace(/\s+/g, " ").trim()
}

/**
 * Iteration-1 Web RAG:
 * - Use Tavily to get top N results (content is already "most relevant extracted content")
 * - Build an in-memory VectorStoreIndex via LlamaIndex
 * - Retrieve topK nodes/chunks for the user's query
 * - Return a compact context string with numbered sources
 */
export async function buildWebRagContext(query: string): Promise<WebRagResult | null> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) return null

  const maxResults = toInt(process.env.RAG_TAVILY_MAX_RESULTS, 6)
  const topK = toInt(process.env.RAG_SIMILARITY_TOP_K, 6)

  const tavily = new TavilyClient({ apiKey })
  const search = await tavily.search({
    query,
    search_depth: "basic",
    include_answer: false,
    include_images: false,
    include_raw_content: false,
    max_results: maxResults,
  })

  const docs = (search.results ?? [])
    .filter((r) => r?.content && r?.url)
    .map((r, idx) => {
      const text = normalizeWhitespace(r.content)
      return new Document({
        text,
        metadata: {
          url: r.url,
          title: r.title,
          score: r.score,
          sourceId: idx + 1, // 1-based for citations
        },
      })
    })

  if (!docs.length) return null

  const embedModelName = process.env.RAG_OLLAMA_EMBED_MODEL || "nomic-embed-text"
  const ollamaHost = process.env.OLLAMA_HOST || "http://127.0.0.1:11434"
  const embedModel = new OllamaEmbedding({ host: ollamaHost, model: embedModelName })

  const nodes = await Settings.withEmbedModel(embedModel, async () => {
    const index = await VectorStoreIndex.fromDocuments(docs)
    const retriever = index.asRetriever({ similarityTopK: topK })
    return await retriever.retrieve(query)
  })

  // Build numbered sources list (from Tavily results; keep stable ordering by sourceId)
  const sourceMap = new Map<number, WebRagSource>()
  for (const d of docs) {
    const id = Number(d.metadata?.sourceId)
    if (!id || sourceMap.has(id)) continue
    sourceMap.set(id, {
      id,
      title: String(d.metadata?.title ?? ""),
      url: String(d.metadata?.url ?? ""),
      score: d.metadata?.score ? String(d.metadata.score) : undefined,
    })
  }

  // Build evidence from retrieved nodes (may include multiple chunks from same source)
  const evidenceLines: string[] = []
  for (const item of nodes) {
    const node = item.node
    const sourceId = Number(node.metadata?.sourceId)
    const text = normalizeWhitespace(node.getContent(MetadataMode.NONE))
    if (!text) continue
    const prefix = Number.isFinite(sourceId) && sourceId > 0 ? `[${sourceId}]` : "[source]"
    evidenceLines.push(`${prefix} ${text}`)
  }

  if (!evidenceLines.length) return null

  const sources = Array.from(sourceMap.values()).sort((a, b) => a.id - b.id)
  const sourcesMd = sources
    .map((s) => `- [${s.id}] ${s.title || s.url} (${s.url})`)
    .join("\n")

  const context = [
    "WEB_EVIDENCE (use these as the primary factual basis; cite with [n]):",
    evidenceLines.slice(0, topK).join("\n"),
    "",
    "SOURCES:",
    sourcesMd,
  ].join("\n")

  return { context, sources }
}


