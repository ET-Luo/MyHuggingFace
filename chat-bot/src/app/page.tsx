"use client"

import * as React from "react"
import { ChatInput } from "@/components/chat/chat-input"
import { ChatList } from "@/components/chat/chat-list"
import { Message } from "@/components/chat/chat-message"

export default function Home() {
  const [messages, setMessages] = React.useState<Message[]>([])
  const [isLoading, setIsLoading] = React.useState(false)

  const handleSend = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
    }
    
    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          }))
        }),
      })

      if (!response.ok) throw new Error("Network response was not ok")
      if (!response.body) throw new Error("No response body")

      // Create a placeholder message for the AI response
      const aiMessageId = (Date.now() + 1).toString()
      setMessages((prev) => [
        ...prev, 
        { id: aiMessageId, role: "assistant", content: "" }
      ])

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let aiContent = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value, { stream: true })
        aiContent += chunk
        
        // Update the AI message in real-time
        setMessages((prev) => 
          prev.map((msg) => 
            msg.id === aiMessageId 
              ? { ...msg, content: aiContent }
              : msg
          )
        )
      }
    } catch (error) {
      console.error("Failed to send message:", error)
      // Optionally add an error message to the chat
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex flex-col h-screen bg-muted/10">
      <header className="h-14 border-b flex items-center px-6 bg-background shadow-sm z-10 justify-between">
        <h1 className="font-semibold text-lg">Personal AI Assistant</h1>
        <div className="text-xs text-muted-foreground">
          Model: qwen3:4b (via Ollama)
        </div>
      </header>
      <div className="flex-1 overflow-hidden flex flex-col">
        <ChatList messages={messages} />
        <ChatInput onSend={handleSend} isLoading={isLoading} />
      </div>
    </main>
  )
}
