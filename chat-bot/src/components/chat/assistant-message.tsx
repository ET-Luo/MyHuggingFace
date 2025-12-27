"use client"

import React, { useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"
import "katex/dist/katex.min.css"
import { Brain, ChevronDown, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

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
        {isOpen ? (
          <ChevronDown className="h-3 w-3 ml-auto" />
        ) : (
          <ChevronRight className="h-3 w-3 ml-auto" />
        )}
      </button>
      {isOpen && (
        <div className="p-3 border-t text-muted-foreground text-sm bg-background/50">
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

export function AssistantMessage({ content }: { content: string }) {
  // Parse <think> tags
  let thinkContent = ""
  let mainContent = content

  const thinkMatch = /<think>([\s\S]*?)(?:<\/think>|$)/.exec(content)
  if (thinkMatch) {
    thinkContent = thinkMatch[1]
    mainContent = content.replace(/<think>[\s\S]*?(?:<\/think>|$)/, "").trim()
  }

  return (
    <div className="prose dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:p-0 break-words">
      {thinkContent && <ThinkBlock content={thinkContent} />}

      {mainContent ? (
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{
            p({ children }) {
              return <p className="mb-2 last:mb-0">{children}</p>
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            code({ inline, className, children, ...props }: any) {
              const match = /language-(\w+)/.exec(className || "")
              return !inline && match ? (
                <div className="rounded-md overflow-hidden my-2">
                  <div className="bg-zinc-800 px-4 py-1 text-xs text-zinc-400 flex justify-between items-center">
                    <span>{match[1]}</span>
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
                <code
                  {...props}
                  className={cn(
                    "bg-muted px-1.5 py-0.5 rounded font-mono text-xs",
                    className
                  )}
                >
                  {children}
                </code>
              )
            },
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
          <span className="text-xs text-muted-foreground italic">
            AI is thinking...
          </span>
        </div>
      )}
    </div>
  )
}



