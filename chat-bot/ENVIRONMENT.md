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

### Build mode (Tauri static export)
- **`TAURI_BUILD`**: set to `1` only when building the Tauri static export (`next.config.ts` will enable `output: "export"`).


