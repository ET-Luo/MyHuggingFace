import * as React from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChatMessage, Message } from "./chat-message"
import { Button } from "@/components/ui/button"

interface ChatListProps {
  messages: Message[]
  streamingMessage?: Message | null
  initialVisibleCount?: number
}

export function ChatList({
  messages,
  streamingMessage,
  initialVisibleCount = 2,
}: ChatListProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [visibleCount, setVisibleCount] = React.useState(() =>
    Math.max(0, initialVisibleCount)
  )

  // When switching sessions, reset to the default window size.
  React.useEffect(() => {
    setVisibleCount(Math.max(0, initialVisibleCount))
  }, [initialVisibleCount])

  const showAll = visibleCount >= messages.length
  const visibleMessages = React.useMemo(() => {
    if (messages.length <= visibleCount) return messages
    return messages.slice(-visibleCount)
  }, [messages, visibleCount])

  React.useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [visibleMessages, streamingMessage])

  return (
    <ScrollArea ref={scrollRef} className="flex-1 h-full">
      <div className="flex flex-col max-w-3xl mx-auto p-4 pb-32">
        {messages.length > visibleCount && (
          <div className="flex justify-center mb-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => setVisibleCount(messages.length)}
            >
              Show earlier messages
            </Button>
          </div>
        )}

        {visibleMessages.map((message) => (
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


