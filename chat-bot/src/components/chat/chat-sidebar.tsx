import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChatSession } from "@/hooks/use-chat-history"
import { cn } from "@/lib/utils"
import { MessageSquarePlus, Trash2, MessageSquare } from "lucide-react"

interface ChatSidebarProps {
  sessions: ChatSession[]
  currentSessionId: string | null
  onSelectSession: (id: string) => void
  onCreateSession: () => void
  onDeleteSession: (id: string) => void
}

export function ChatSidebar({
  sessions,
  currentSessionId,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
}: ChatSidebarProps) {
  return (
    <div className="w-64 border-r bg-muted/20 flex flex-col h-full">
      <div className="p-4 border-b">
        <Button onClick={onCreateSession} className="w-full justify-start gap-2" variant="default">
          <MessageSquarePlus className="h-4 w-4" />
          New Chat
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={cn(
                "group flex items-center justify-between p-2 rounded-lg hover:bg-accent cursor-pointer transition-colors",
                currentSessionId === session.id ? "bg-accent" : "text-muted-foreground"
              )}
              onClick={() => onSelectSession(session.id)}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <MessageSquare className="h-4 w-4 shrink-0" />
                <span className="text-sm truncate">{session.title}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteSession(session.id)
                }}
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

