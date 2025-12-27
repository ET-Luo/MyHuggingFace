"use client"

import * as React from "react"
import { ChatInput } from "@/components/chat/chat-input"
import { ChatList } from "@/components/chat/chat-list"
import { ChatSidebar } from "@/components/chat/chat-sidebar"
import { Message } from "@/components/chat/chat-message"
import { useChatHistory } from "@/hooks/use-chat-history"
import { Menu } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function Home() {
  const {
    sessions,
    currentSessionId,
    setCurrentSessionId,
    createNewSession,
    deleteSession,
    currentMessages,
    updateCurrentSessionMessages,
    isInitialized
  } = useChatHistory()
  
  const [isLoading, setIsLoading] = React.useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)
  const [selectedModel, setSelectedModel] = React.useState("qwen3:4b")
  const [streamingMessage, setStreamingMessage] = React.useState<Message | null>(null)

  const handleSend = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
    }
    
    // Optimistic update for the UI
    const updatedMessages = [...currentMessages, userMessage]
    updateCurrentSessionMessages(updatedMessages)
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({
            role: m.role,
            content: m.content
          })),
          model: selectedModel
        }),
      })

      if (!response.ok) throw new Error("Network response was not ok")
      if (!response.body) throw new Error("No response body")

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let aiContent = ""
      
      // Initialize streaming message
      const aiMessageId = (Date.now() + 1).toString()
      setStreamingMessage({ id: aiMessageId, role: "assistant", content: "" })

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value, { stream: true })
        aiContent += chunk
        
        // Only update the local streaming state, avoid triggering full session save
        setStreamingMessage(prev => prev ? { ...prev, content: aiContent } : null)
      }

      // Finalize: save to history once after stream is complete
      const finalAiMessage: Message = { id: aiMessageId, role: "assistant", content: aiContent }
      updateCurrentSessionMessages([...updatedMessages, finalAiMessage])
      setStreamingMessage(null)
    } catch (error) {
      console.error("Failed to send message:", error)
      setStreamingMessage(null)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isInitialized) {
    return null // or a loading spinner
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <ChatSidebar
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={setCurrentSessionId}
          onCreateSession={createNewSession}
          onDeleteSession={deleteSession}
        />
      </div>

      <main className="flex flex-col flex-1 h-full relative">
        <header className="h-14 border-b flex items-center px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 justify-between">
          <div className="flex items-center gap-2">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72">
                 <ChatSidebar
                  sessions={sessions}
                  currentSessionId={currentSessionId}
                  onSelectSession={(id) => {
                    setCurrentSessionId(id)
                    setIsMobileMenuOpen(false)
                  }}
                  onCreateSession={() => {
                    createNewSession()
                    setIsMobileMenuOpen(false)
                  }}
                  onDeleteSession={deleteSession}
                />
              </SheetContent>
            </Sheet>
            <h1 className="font-semibold text-lg">Personal AI Assistant</h1>
          </div>
          <div className="flex items-center gap-2">
             <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-[240px] h-8 text-xs">
                <SelectValue placeholder="Select Model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="qwen3:4b">qwen3:4b (Local)</SelectItem>
                <SelectItem value="deepseek-v3.1:671b-cloud">deepseek-v3.1:671b (Cloud)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </header>
        
        <div className="flex-1 relative overflow-hidden">
          <ChatList messages={currentMessages} streamingMessage={streamingMessage} />
          <ChatInput onSend={handleSend} isLoading={isLoading} />
        </div>
      </main>
    </div>
  )
}
