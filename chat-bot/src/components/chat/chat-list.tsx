import { ScrollArea } from "@/components/ui/scroll-area"
import { ChatMessage, Message } from "./chat-message"

interface ChatListProps {
  messages: Message[]
}

export function ChatList({ messages }: ChatListProps) {
  return (
    <ScrollArea className="flex-1 p-4 h-full">
      <div className="flex flex-col max-w-3xl mx-auto pb-4">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-[50vh] text-center text-muted-foreground">
            <p className="text-lg font-medium">Welcome to your AI Assistant</p>
            <p className="text-sm">Start a conversation by typing a message below.</p>
          </div>
        )}
      </div>
    </ScrollArea>
  )
}


