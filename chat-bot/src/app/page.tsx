"use client"

import * as React from "react"
import { ChatInput } from "@/components/chat/chat-input"
import { ChatList } from "@/components/chat/chat-list"
import { ChatSidebar } from "@/components/chat/chat-sidebar"
import { Message } from "@/components/chat/chat-message"
import { useChatHistory } from "@/hooks/use-chat-history"
import { Menu } from "lucide-react"
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
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
    selectSession,
    createNewSession,
    deleteSession,
    renameSession,
    currentMessages,
    updateCurrentSessionMessages,
    isInitialized
  } = useChatHistory()
  
  const [isLoading, setIsLoading] = React.useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)
  const [selectedModel, setSelectedModel] = React.useState("qwen3:4b")
  const [streamingMessage, setStreamingMessage] = React.useState<Message | null>(null)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false)

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

    // Initialize streaming message immediately as a placeholder
    const aiMessageId = (Date.now() + 1).toString()
    setStreamingMessage({ id: aiMessageId, role: "assistant", content: "" })

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
      <div className={cn(
        "hidden md:block transition-all duration-300",
        isSidebarCollapsed ? "w-16" : "w-64"
      )}>
        <ChatSidebar
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={selectSession}
          onCreateSession={createNewSession}
          onDeleteSession={deleteSession}
          onRenameSession={renameSession}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </div>

      <main className="flex flex-col flex-1 h-full relative overflow-hidden">
        <header className="h-14 border-b flex items-center px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 justify-between">
          <div className="flex items-center gap-2">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72">
                {/* a11y: Radix DialogContent requires a Title/Description for screen readers */}
                <SheetTitle className="sr-only">Chat history</SheetTitle>
                <SheetDescription className="sr-only">
                  Select a conversation, rename or delete it, or start a new chat.
                </SheetDescription>
                 <ChatSidebar
                  sessions={sessions}
                  currentSessionId={currentSessionId}
                  onSelectSession={(id) => {
                    selectSession(id)
                    setIsMobileMenuOpen(false)
                  }}
                  onCreateSession={() => {
                    createNewSession()
                    setIsMobileMenuOpen(false)
                  }}
                  onDeleteSession={deleteSession}
                  onRenameSession={renameSession}
                  isCollapsed={false}
                  onToggleCollapse={() => setIsMobileMenuOpen(false)}
                />
              </SheetContent>
            </Sheet>
            
            {/* Show toggle button in header when sidebar is collapsed on desktop */}
            {isSidebarCollapsed && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsSidebarCollapsed(false)}
                className="hidden md:flex"
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
            
            <h1 className="font-semibold text-lg ml-1">Personal AI Assistant</h1>
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
