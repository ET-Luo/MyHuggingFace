"use client"

import { useState, useEffect } from "react"
import { Message } from "@/components/chat/chat-message"

export interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: number
}

const STORAGE_KEY = "chat_history"

export function useChatHistory() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  // A "New Chat" that hasn't received any user message yet (Gemini-like: not stored until first message).
  const [pendingSession, setPendingSession] = useState<ChatSession | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  const generateId = () => {
    // Prefer UUIDs to avoid collisions (Date.now can collide within the same ms).
    try {
      return crypto.randomUUID()
    } catch {
      return `${Date.now()}_${Math.random().toString(16).slice(2)}`
    }
  }

  const normalizeSessions = (raw: unknown): ChatSession[] => {
    if (!Array.isArray(raw)) return []
    const used = new Set<string>()

    return raw
      .map((s: any) => {
        const base: ChatSession = {
          id: typeof s?.id === "string" ? s.id : generateId(),
          title: typeof s?.title === "string" ? s.title : "New Chat",
          messages: Array.isArray(s?.messages) ? s.messages : [],
          createdAt: typeof s?.createdAt === "number" ? s.createdAt : Date.now(),
        }

        // Ensure uniqueness even if localStorage already contains duplicates.
        if (used.has(base.id)) base.id = generateId()
        used.add(base.id)
        return base
      })
      .filter(Boolean)
  }

  const upsertById = (prev: ChatSession[], session: ChatSession) => {
    const idx = prev.findIndex((s) => s.id === session.id)
    if (idx === -1) return [session, ...prev]
    const next = prev.slice()
    next[idx] = session
    return next
  }

  const deriveTitle = (existingTitle: string, messages: Message[]) => {
    if (existingTitle !== "New Chat" || messages.length === 0) return existingTitle
    const firstUserMsg = messages.find((m) => m.role === "user" && m.content?.trim())
    if (!firstUserMsg) return existingTitle
    return (
      firstUserMsg.content.slice(0, 30) +
      (firstUserMsg.content.length > 30 ? "..." : "")
    )
  }

  const createPendingSession = () => {
    const newSession: ChatSession = {
      id: generateId(),
      title: "New Chat",
      messages: [],
      createdAt: Date.now(),
    }
    setPendingSession(newSession)
    setCurrentSessionId(newSession.id)
    return newSession.id
  }

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        const normalized = normalizeSessions(parsed)
        setSessions(normalized)
        if (normalized.length > 0) {
          setCurrentSessionId(normalized[0].id)
          setPendingSession(null)
        } else {
          createPendingSession()
        }
      } catch (e) {
        console.error("Failed to parse chat history", e)
        createPendingSession()
      }
    } else {
      createPendingSession()
    }
    setIsInitialized(true)
  }, [])

  // Save to localStorage whenever sessions change
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
    }
  }, [sessions, isInitialized])

  const createNewSession = () => createPendingSession()

  // Selecting an existing session should drop an empty pending session (Gemini-like).
  const selectSession = (id: string | null) => {
    setCurrentSessionId(id)
    setPendingSession((prev) => {
      if (!prev) return prev
      if (id !== prev.id && prev.messages.length === 0) return null
      return prev
    })
  }

  const deleteSession = (id: string) => {
    setSessions((prev) => {
      const remaining = prev.filter((s) => s.id !== id)

      // If current session was deleted, select the newest remaining session, otherwise go pending.
      setCurrentSessionId((prevId) => {
        if (prevId !== id) return prevId
        if (remaining.length > 0) return remaining[0].id
        // No stored sessions left → go to an unpersisted pending chat.
        return null
      })

      if (remaining.length === 0) {
        // ensure we have a pending session to land on
        createPendingSession()
      }

      return remaining
    })
  }

  const renameSession = (id: string, newTitle: string) => {
    const title = newTitle.trim()
    if (!title) return
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title } : s))
    )
  }

  const updateCurrentSessionMessages = (messages: Message[]) => {
    if (!currentSessionId) return

    const hasNonEmptyUserMsg = messages.some(
      (m) => m.role === "user" && m.content?.trim().length
    )

    // 1) Update stored session if it exists (purely functional to avoid stale closures)
    setSessions((prev) => {
      const idx = prev.findIndex((s) => s.id === currentSessionId)
      if (idx === -1) return prev
      const session = prev[idx]
      const title = deriveTitle(session.title, messages)
      const updated = { ...session, messages, title }
      const next = prev.slice()
      next[idx] = updated
      return next
    })

    // 2) Pending session: update in-memory, and only commit once (upsert) when the user actually sends content.
    setPendingSession((prevPending) => {
      if (!prevPending || prevPending.id !== currentSessionId) return prevPending

      const title = deriveTitle(prevPending.title, messages)
      const updatedPending: ChatSession = { ...prevPending, messages, title }

      if (hasNonEmptyUserMsg) {
        // Commit idempotently: if already committed (e.g. due to rapid successive updates),
        // just update the existing stored session instead of inserting duplicates.
        setSessions((prev) => upsertById(prev, updatedPending))
        return null
      }

      return updatedPending
    })
  }

  const currentSession = sessions.find((s) => s.id === currentSessionId)
  const currentPending =
    pendingSession?.id === currentSessionId ? pendingSession : null

  return {
    sessions,
    currentSessionId,
    selectSession,
    createNewSession,
    deleteSession,
    renameSession,
    currentMessages: currentSession?.messages || currentPending?.messages || [],
    updateCurrentSessionMessages,
    isInitialized
  }
}

