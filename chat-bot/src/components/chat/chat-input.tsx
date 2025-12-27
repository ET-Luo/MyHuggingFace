import * as React from "react"
import { Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

interface ChatInputProps {
  onSend: (message: string) => void
  isLoading?: boolean
}

export function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const [input, setInput] = React.useState("")

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (input.trim()) {
        onSend(input)
        setInput("")
      }
    }
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background/90 to-transparent pt-10">
      <div className="max-w-3xl mx-auto">
        <div className="relative flex items-center bg-background border rounded-2xl shadow-lg ring-1 ring-black/5 dark:ring-white/10">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="min-h-[56px] w-full pr-12 resize-none bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 py-4 px-4 rounded-2xl"
            rows={1}
          />
          <Button
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-xl transition-all"
            onClick={() => {
              if (input.trim()) {
                onSend(input)
                setInput("")
              }
            }}
            disabled={isLoading || !input.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-[10px] sm:text-xs text-muted-foreground mt-2 text-center">
          AI can make mistakes. Please verify important information.
        </div>
      </div>
    </div>
  )
}


