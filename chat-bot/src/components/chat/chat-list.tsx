import * as React from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChatMessage, Message } from "./chat-message"

interface ChatListProps {
  messages: Message[]
  streamingMessage?: Message | null
}

export function ChatList({ messages, streamingMessage }: ChatListProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages, streamingMessage])

  return (
    <ScrollArea ref={scrollRef} className="flex-1 h-full">
      <div className="flex flex-col max-w-3xl mx-auto p-4 pb-32">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        {streamingMessage && (
          <ChatMessage key={streamingMessage.id} message={streamingMessage} />
        )}
        {messages.length === 0 && !streamingMessage && (
          <div className="flex flex-col items-center justify-center h-[50vh] text-center text-muted-foreground">
            <p className="text-lg font-medium">Welcome to your AI Assistant</p>
            <p className="text-sm">Start a conversation by typing a message below.</p>
          </div>
        )}
      </div>
    </ScrollArea>
  )
}


