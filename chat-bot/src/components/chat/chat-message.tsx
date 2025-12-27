import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import ReactMarkdown, { Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"
import "katex/dist/katex.min.css"
import { Brain, ChevronDown, ChevronRight, Sparkles } from "lucide-react"
import React, { useState } from "react"
// ... (rest of imports unchanged)

export interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
}

interface ChatMessageProps {
  message: Message
}

function ThinkBlock({ content }: { content: string }) {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div className="mb-4 border rounded-lg bg-muted/50 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full p-2 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
      >
        <Brain className="h-3 w-3" />
        <span>Thinking Process</span>
        {isOpen ? <ChevronDown className="h-3 w-3 ml-auto" /> : <ChevronRight className="h-3 w-3 ml-auto" />}
      </button>
      {isOpen && (
         <div className="p-3 border-t text-muted-foreground text-sm bg-background/50">
           {/* Use simpler rendering for thoughts, or full markdown if preferred */}
           <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
               {content}
             </ReactMarkdown>
           </div>
         </div>
      )}
    </div>
  )
}

export const ChatMessage = React.memo(({ message }: ChatMessageProps) => {
  const isUser = message.role === "user"
  
  // Parse <think> tags
  let thinkContent = ""
  let mainContent = message.content

  if (!isUser) {
    const thinkMatch = /<think>([\s\S]*?)(?:<\/think>|$)/.exec(message.content)
    if (thinkMatch) {
      thinkContent = thinkMatch[1]
      mainContent = message.content.replace(/<think>[\s\S]*?(?:<\/think>|$)/, "").trim()
    }
  }

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
            <div className="prose dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:p-0 break-words">
              {thinkContent && <ThinkBlock content={thinkContent} />}
              
              {/* Only render main content if it exists (handle case where only thinking is present during stream) */}
              {mainContent ? (
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
                  {mainContent}
                </ReactMarkdown>
              ) : (
                <div className="flex items-center gap-2 py-1">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce"></span>
                  </div>
                  <span className="text-xs text-muted-foreground italic">AI is thinking...</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

ChatMessage.displayName = "ChatMessage"
