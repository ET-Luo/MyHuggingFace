import { JSDOM } from "jsdom"
import { Readability } from "@mozilla/readability"
import pLimit from "p-limit"

export type WebPage = {
  url: string
  title: string
  text: string
}

export type FetchWebPagesOptions = {
  concurrency?: number
  timeoutMs?: number
  maxHtmlBytes?: number
  userAgent?: string
}

function normalizeWhitespace(s: string) {
  return s.replace(/\s+/g, " ").trim()
}

function isIpLiteral(hostname: string) {
  // IPv4 simple check or IPv6 (contains ':')
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.includes(":")
}

function isPrivateIpv4(ip: string) {
  const parts = ip.split(".").map((x) => Number.parseInt(x, 10))
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return true
  const [a, b] = parts
  if (a === 10) return true
  if (a === 127) return true
  if (a === 169 && b === 254) return true
  if (a === 192 && b === 168) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  return false
}

function isBlockedHost(hostname: string) {
  const h = hostname.toLowerCase()
  if (h === "localhost" || h.endsWith(".localhost")) return true
  if (h === "0.0.0.0") return true
  if (h === "::1") return true
  if (h.endsWith(".local")) return true
  if (isIpLiteral(h)) {
    // If user passes IP literal, apply basic private checks (IPv4 only).
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return isPrivateIpv4(h)
    // For IPv6 literals, conservatively block (avoid SSRF).
    return true
  }
  return false
}

function assertSafeHttpUrl(input: string): URL {
  const url = new URL(input)
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Blocked URL protocol: ${url.protocol}`)
  }
  if (isBlockedHost(url.hostname)) {
    throw new Error(`Blocked URL host: ${url.hostname}`)
  }
  return url
}

async function fetchHtml(url: URL, opts: Required<FetchWebPagesOptions>): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs)
  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": opts.userAgent,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: controller.signal,
    })

    if (!res.ok) throw new Error(`Fetch failed (${res.status})`)

    const len = Number.parseInt(res.headers.get("content-length") ?? "", 10)
    if (Number.isFinite(len) && len > opts.maxHtmlBytes) {
      throw new Error(`HTML too large (content-length=${len})`)
    }

    const buf = await res.arrayBuffer()
    if (buf.byteLength > opts.maxHtmlBytes) {
      throw new Error(`HTML too large (bytes=${buf.byteLength})`)
    }
    return new TextDecoder("utf-8").decode(buf)
  } finally {
    clearTimeout(timer)
  }
}

function extractReadable(url: string, html: string): { title: string; text: string } | null {
  const dom = new JSDOM(html, { url })
  const reader = new Readability(dom.window.document)
  const article = reader.parse()
  if (!article?.textContent) return null
  const text = normalizeWhitespace(article.textContent)
  if (!text || text.length < 200) return null
  return { title: normalizeWhitespace(article.title || dom.window.document.title || url), text }
}

export async function fetchReadablePages(urls: string[], options?: FetchWebPagesOptions): Promise<WebPage[]> {
  const opts: Required<FetchWebPagesOptions> = {
    concurrency: options?.concurrency ?? 3,
    timeoutMs: options?.timeoutMs ?? 10_000,
    maxHtmlBytes: options?.maxHtmlBytes ?? 1_200_000, // ~1.2MB
    userAgent:
      options?.userAgent ??
      "Mozilla/5.0 (compatible; EliaBot/1.0; +https://example.local) AppleWebKit/537.36",
  }

  const limit = pLimit(opts.concurrency)
  const tasks = urls.map((u) =>
    limit(async () => {
      const safe = assertSafeHttpUrl(u)
      const html = await fetchHtml(safe, opts)
      const readable = extractReadable(safe.toString(), html)
      if (!readable) return null
      return { url: safe.toString(), title: readable.title, text: readable.text } satisfies WebPage
    })
  )

  const settled = await Promise.allSettled(tasks)
  const pages: WebPage[] = []
  for (const s of settled) {
    if (s.status === "fulfilled" && s.value) pages.push(s.value)
  }
  return pages
}

export function chunkText(
  text: string,
  opts?: { chunkSize?: number; overlap?: number; minChunkSize?: number }
) {
  const chunkSize = opts?.chunkSize ?? 1200
  const overlap = opts?.overlap ?? 200
  const minChunkSize = opts?.minChunkSize ?? 300

  const cleaned = normalizeWhitespace(text)
  if (cleaned.length <= chunkSize) return cleaned.length >= minChunkSize ? [cleaned] : []

  const chunks: string[] = []
  let start = 0
  while (start < cleaned.length) {
    const end = Math.min(cleaned.length, start + chunkSize)
    const chunk = cleaned.slice(start, end).trim()
    if (chunk.length >= minChunkSize) chunks.push(chunk)
    if (end >= cleaned.length) break
    start = Math.max(0, end - overlap)
  }
  return chunks
}


