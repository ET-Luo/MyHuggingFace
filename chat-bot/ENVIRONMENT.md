## Environment variables

### Ollama (local)
- **`OLLAMA_HOST`**: defaults to `http://127.0.0.1:11434`
- **`RAG_OLLAMA_EMBED_MODEL`**: embedding model name in Ollama (example: `nomic-embed-text`)

### Tavily (web search)
- **`TAVILY_API_KEY`**: required to enable web search. Get it from `https://docs.tavily.com`.

### RAG switches
- **`RAG_ENABLE_WEB`**: set to `1` to enable web RAG by default (can still be overridden per-request)
- **`RAG_TAVILY_MAX_RESULTS`**: default `6`
- **`RAG_SIMILARITY_TOP_K`**: default `6`
- **`RAG_TAVILY_SEARCH_DEPTH`**: `basic` (default) or `advanced`
- **`RAG_USE_READABILITY`**: set to `0` to disable full-page fetching / readability extraction (fallback to Tavily content)
- **`RAG_DISABLE_EMBEDDINGS`**: set to `1` to skip embeddings entirely (use keyword fallback; useful if remote Ollama embeddings are unstable)
- **`RAG_FETCH_CONCURRENCY`**: default `3`
- **`RAG_FETCH_TIMEOUT_MS`**: default `10000`
- **`RAG_FETCH_MAX_HTML_BYTES`**: default `1200000`
- **`RAG_CHUNK_SIZE`**: default `1200`
- **`RAG_CHUNK_OVERLAP`**: default `200`
- **`RAG_MIN_CHUNK_SIZE`**: default `300`
- **`RAG_MAX_EVIDENCE_CHARS_PER_CHUNK`**: default `600`
- **`RAG_MAX_CHUNKS_PER_SOURCE`**: default `2`
- **`RAG_MAX_SEARCH_ANSWER_CHARS`**: default `600`

### Build mode (Tauri static export)
- **`TAURI_BUILD`**: set to `1` only when building the Tauri static export (`next.config.ts` will enable `output: "export"`).


