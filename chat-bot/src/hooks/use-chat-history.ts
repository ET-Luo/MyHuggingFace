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
  const [isInitialized, setIsInitialized] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setSessions(parsed)
        if (parsed.length > 0) {
          setCurrentSessionId(parsed[0].id)
        } else {
          createNewSession()
        }
      } catch (e) {
        console.error("Failed to parse chat history", e)
        createNewSession()
      }
    } else {
      createNewSession()
    }
    setIsInitialized(true)
  }, [])

  // Save to localStorage whenever sessions change
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
    }
  }, [sessions, isInitialized])

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: "New Chat",
      messages: [],
      createdAt: Date.now(),
    }
    setSessions((prev) => [newSession, ...prev])
    setCurrentSessionId(newSession.id)
    return newSession.id
  }

  const deleteSession = (id: string) => {
    setSessions((prev) => {
      const remaining = prev.filter((s) => s.id !== id)

      // If we deleted the last session, immediately create a new one to keep UX consistent.
      if (remaining.length === 0) {
        const newSession: ChatSession = {
          id: Date.now().toString(),
          title: "New Chat",
          messages: [],
          createdAt: Date.now(),
        }
        setCurrentSessionId(newSession.id)
        return [newSession]
      }

      // If current session was deleted, select the newest remaining session.
      setCurrentSessionId((prevId) => (prevId === id ? remaining[0].id : prevId))
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

    setSessions((prev) =>
      prev.map((session) => {
        if (session.id === currentSessionId) {
          // Generate a title from the first user message if title is "New Chat"
          let title = session.title
          if (session.title === "New Chat" && messages.length > 0) {
            const firstUserMsg = messages.find(m => m.role === "user")
            if (firstUserMsg) {
              title = firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? "..." : "")
            }
          }
          return { ...session, messages, title }
        }
        return session
      })
    )
  }

  const currentSession = sessions.find((s) => s.id === currentSessionId)

  return {
    sessions,
    currentSessionId,
    setCurrentSessionId,
    createNewSession,
    deleteSession,
    renameSession,
    currentMessages: currentSession?.messages || [],
    updateCurrentSessionMessages,
    isInitialized
  }
}

