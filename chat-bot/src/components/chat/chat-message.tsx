import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { Sparkles } from "lucide-react"
import React from "react"

const AssistantMessage = React.lazy(() =>
  import("./assistant-message").then((m) => ({ default: m.AssistantMessage }))
)

export interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
}

interface ChatMessageProps {
  message: Message
}

function stripThink(content: string) {
  // Remove <think> blocks (including incomplete streaming cases) for plain-text fallback.
  return content.replace(/<think>[\s\S]*?(?:<\/think>|$)/, "").trim()
}

function AssistantPlain({ content }: { content: string }) {
  const main = stripThink(content)

  if (!main) {
    return (
      <div className="flex items-center gap-2 py-1">
        <div className="flex gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.3s]"></span>
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.15s]"></span>
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce"></span>
        </div>
        <span className="text-xs text-muted-foreground italic">AI is thinking...</span>
      </div>
    )
  }

  // Plain text fallback is intentionally lightweight to improve LCP when history exists on load.
  return <div className="whitespace-pre-wrap break-words leading-relaxed">{main}</div>
}

export const ChatMessage = React.memo(({ message }: ChatMessageProps) => {
  const isUser = message.role === "user"

  return (
    <div className={cn("flex w-full mb-6", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("flex gap-3 max-w-[90%] md:max-w-[80%]", isUser ? "flex-row-reverse" : "flex-row")}>
        <Avatar className="h-8 w-8 shrink-0 mt-1">
          {isUser ? (
            <AvatarFallback className="bg-primary text-primary-foreground">
              ME
            </AvatarFallback>
          ) : (
            <AvatarFallback
              className={cn(
                "text-white",
                "bg-gradient-to-br from-sky-500 via-violet-500 to-fuchsia-500",
                "ring-1 ring-black/5 dark:ring-white/10"
              )}
              aria-label="AI"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </AvatarFallback>
          )}
        </Avatar>
        
        <div
          className={cn(
            "px-4 py-3 rounded-2xl text-sm shadow-sm overflow-hidden",
            isUser 
              ? "bg-primary text-primary-foreground rounded-tr-none" 
              : "bg-card border rounded-tl-none text-card-foreground"
          )}
        >
          {isUser ? (
            <div className="whitespace-pre-wrap">{message.content}</div>
          ) : (
            <React.Suspense fallback={<AssistantPlain content={message.content} />}>
              <AssistantMessage content={message.content} />
            </React.Suspense>
          )}
        </div>
      </div>
    </div>
  )
})

ChatMessage.displayName = "ChatMessage"
