import { TavilyClient } from "tavily"
import { Document, MetadataMode, Settings, VectorStoreIndex } from "llamaindex"
import { OllamaEmbedding } from "./ollama-embedding"
import { chunkText, fetchReadablePages } from "./web-fetch"

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

function uniqBy<T>(items: T[], key: (t: T) => string) {
  const seen = new Set<string>()
  const out: T[] = []
  for (const it of items) {
    const k = key(it)
    if (seen.has(k)) continue
    seen.add(k)
    out.push(it)
  }
  return out
}

function truncate(s: string, maxLen: number) {
  if (s.length <= maxLen) return s
  return `${s.slice(0, maxLen).trim()}…`
}

function queryTokens(query: string) {
  // Keep ASCII-ish tokens for robust matching (works well for version numbers / product names).
  // For CJK queries, this still extracts "node", "js", "v20", etc if present.
  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9._+-]+/g)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
  return uniqBy(tokens, (t) => t)
}

function scoreChunk(text: string, tokens: string[]) {
  if (!tokens.length) return 0
  const lower = text.toLowerCase()
  let score = 0
  for (const t of tokens) {
    if (!t) continue
    // simple hit count: presence boosts, multiple occurrences boost a bit more
    const hits = lower.split(t).length - 1
    if (hits > 0) score += 3 + Math.min(hits, 5)
  }
  // slight boost if the chunk contains a version-like pattern
  if (/\bv?\d+\.\d+\.\d+\b/i.test(lower)) score += 2
  return score
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
  const useReadable = process.env.RAG_USE_READABILITY !== "0"
  const disableEmbeddings = process.env.RAG_DISABLE_EMBEDDINGS === "1"
  const maxChunkChars = toInt(process.env.RAG_MAX_EVIDENCE_CHARS_PER_CHUNK, 600)

  const tavily = new TavilyClient({ apiKey })
  const search = await tavily.search({
    query,
    search_depth: process.env.RAG_TAVILY_SEARCH_DEPTH === "advanced" ? "advanced" : "basic",
    include_answer: true,
    include_images: false,
    include_raw_content: true,
    max_results: maxResults,
  })

  const results = (search.results ?? []).filter((r) => r?.url)

  // Build a stable sources list from Tavily results (used for citations).
  const sources: WebRagSource[] = results.map((r, idx) => ({
    id: idx + 1,
    title: String(r.title ?? ""),
    url: String(r.url),
    score: r.score ? String(r.score) : undefined,
  }))

  // Iteration-2: fetch full pages and extract readable text (more stable than snippets).
  // Fallback: use Tavily's extracted content if fetch/readability fails.
  let pagesByUrl = new Map<string, { title: string; text: string }>()
  if (useReadable) {
    const urls = sources.map((s) => s.url)
    try {
      const pages = await fetchReadablePages(urls, {
        concurrency: toInt(process.env.RAG_FETCH_CONCURRENCY, 3),
        timeoutMs: toInt(process.env.RAG_FETCH_TIMEOUT_MS, 10_000),
        maxHtmlBytes: toInt(process.env.RAG_FETCH_MAX_HTML_BYTES, 1_200_000),
      })
      pagesByUrl = new Map(pages.map((p) => [p.url, { title: p.title, text: p.text }]))
    } catch {
      // ignore and fallback to Tavily content
    }
  }

  const docs: Document[] = []
  for (const s of sources) {
    const tavilyResult = results[s.id - 1]
    const readable = pagesByUrl.get(s.url)
    const baseText = readable?.text || normalizeWhitespace(tavilyResult?.raw_content || tavilyResult?.content || "")
    const baseTitle = readable?.title || s.title || s.url
    if (!baseText) continue

    const chunks = chunkText(baseText, {
      chunkSize: toInt(process.env.RAG_CHUNK_SIZE, 1200),
      overlap: toInt(process.env.RAG_CHUNK_OVERLAP, 200),
      minChunkSize: toInt(process.env.RAG_MIN_CHUNK_SIZE, 300),
    })

    for (let i = 0; i < chunks.length; i++) {
      docs.push(
        new Document({
          text: chunks[i],
          metadata: {
            url: s.url,
            title: baseTitle,
            score: s.score,
            sourceId: s.id, // 1-based for citations
            chunkId: i + 1,
          },
        })
      )
    }
  }

  if (!docs.length) return null

  // Retrieve evidence:
  // 1) Prefer vector retrieval (embeddings) when available
  // 2) Fallback to lightweight keyword scoring over chunks (still brings in latest info)
  const evidenceLines: string[] = []

  if (!disableEmbeddings) {
    const embedModelName = process.env.RAG_OLLAMA_EMBED_MODEL || "nomic-embed-text"
    const ollamaHost = process.env.OLLAMA_HOST || "http://127.0.0.1:11434"
    const embedModel = new OllamaEmbedding({ host: ollamaHost, model: embedModelName })

    try {
      const nodes = await Settings.withEmbedModel(embedModel, async () => {
        const index = await VectorStoreIndex.fromDocuments(docs)
        const retriever = index.asRetriever({ similarityTopK: topK })
        return await retriever.retrieve(query)
      })

      for (const item of nodes) {
        const node = item.node
        const sourceId = Number(node.metadata?.sourceId)
        const text = truncate(normalizeWhitespace(node.getContent(MetadataMode.NONE)), maxChunkChars)
        if (!text) continue
        const prefix = Number.isFinite(sourceId) && sourceId > 0 ? `[${sourceId}]` : "[source]"
        evidenceLines.push(`${prefix} ${text}`)
      }
    } catch (err) {
      console.warn("[web-rag] embedding/index failed, fallback to keyword retrieval:", err)
    }
  }

  if (!evidenceLines.length) {
    // Keyword fallback: score chunks by query token hits; keep diversity across sources.
    const tokens = queryTokens(query)
    const perSourceCap = toInt(process.env.RAG_MAX_CHUNKS_PER_SOURCE, 2)

    const scored = docs
      .map((d) => {
        const sourceId = Number(d.metadata?.sourceId)
        const text = normalizeWhitespace(d.getContent(MetadataMode.NONE))
        return {
          sourceId,
          text,
          score: scoreChunk(text, tokens),
        }
      })
      .filter((x) => x.text)
      .sort((a, b) => b.score - a.score)

    const perSourceUsed = new Map<number, number>()
    for (const s of scored) {
      if (evidenceLines.length >= topK) break
      const sid = Number.isFinite(s.sourceId) && s.sourceId > 0 ? s.sourceId : -1
      const used = perSourceUsed.get(sid) ?? 0
      if (used >= perSourceCap) continue
      perSourceUsed.set(sid, used + 1)

      const prefix = sid > 0 ? `[${sid}]` : "[source]"
      evidenceLines.push(`${prefix} ${truncate(s.text, maxChunkChars)}`)
    }

    // If all scores are 0 (or we didn't get enough), just take the first chunk of each source.
    if (evidenceLines.length < Math.min(topK, sources.length)) {
      const bySourceFirst = new Map<number, string>()
      for (const d of docs) {
        const sid = Number(d.metadata?.sourceId)
        if (!sid || bySourceFirst.has(sid)) continue
        const text = normalizeWhitespace(d.getContent(MetadataMode.NONE))
        if (text) bySourceFirst.set(sid, text)
      }
      for (const [sid, text] of Array.from(bySourceFirst.entries()).sort((a, b) => a[0] - b[0])) {
        if (evidenceLines.length >= topK) break
        if (evidenceLines.some((l) => l.startsWith(`[${sid}]`))) continue
        evidenceLines.push(`[${sid}] ${truncate(text, maxChunkChars)}`)
      }
    }
  }

  if (!evidenceLines.length) return null

  const sourcesMd = sources
    .map((s) => `- [${s.id}] [${s.title || s.url}](${s.url})`)
    .join("\n")

  const searchAnswer = normalizeWhitespace(String(search.answer ?? ""))
  const context = [
    "WEB_EVIDENCE (use these as the primary factual basis; cite with [n]):",
    evidenceLines.slice(0, topK).join("\n"),
    ...(searchAnswer
      ? [
          "",
          "SEARCH_ANSWER (may be helpful but do NOT treat as authoritative unless supported by WEB_EVIDENCE):",
          truncate(searchAnswer, toInt(process.env.RAG_MAX_SEARCH_ANSWER_CHARS, 600)),
        ]
      : []),
    "",
    "SOURCES:",
    sourcesMd,
  ].join("\n")

  return { context, sources }
}


