import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import ReactMarkdown, { Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"
import "katex/dist/katex.min.css"

export interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
}

interface ChatMessageProps {
  message: Message
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user"

  return (
    <div className={cn("flex w-full mb-6", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("flex gap-3 max-w-[90%] md:max-w-[80%]", isUser ? "flex-row-reverse" : "flex-row")}>
        <Avatar className="h-8 w-8 shrink-0 mt-1">
          <AvatarFallback className={cn(isUser ? "bg-primary text-primary-foreground" : "bg-muted")}>
            {isUser ? "ME" : "AI"}
          </AvatarFallback>
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
            // User messages usually don't need heavy markdown rendering, but we can enable it if needed.
            // For now, simple text with line breaks is often safer/cleaner for user inputs.
            <div className="whitespace-pre-wrap">{message.content}</div>
          ) : (
            // AI messages get full markdown treatment
            <div className="prose dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:p-0 break-words">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                p({ children }) {
                  return <p className="mb-2 last:mb-0">{children}</p>
                },
                code({ node, inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || "")
                  return !inline && match ? (
                    <div className="rounded-md overflow-hidden my-2">
                      <div className="bg-zinc-800 px-4 py-1 text-xs text-zinc-400 flex justify-between items-center">
                        <span>{match[1]}</span>
                        {/* Future: Add Copy button here */}
                      </div>
                      <SyntaxHighlighter
                        {...props}
                        style={oneDark}
                        language={match[1]}
                        PreTag="div"
                        customStyle={{ margin: 0, borderRadius: 0 }}
                      >
                        {String(children).replace(/\n$/, "")}
                      </SyntaxHighlighter>
                    </div>
                  ) : (
                    <code {...props} className={cn("bg-muted px-1.5 py-0.5 rounded font-mono text-xs", className)}>
                      {children}
                    </code>
                  )
                }
              }}
            >
              {message.content}
            </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
