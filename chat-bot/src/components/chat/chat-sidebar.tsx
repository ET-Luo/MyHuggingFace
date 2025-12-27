"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChatSession } from "@/hooks/use-chat-history"
import { cn } from "@/lib/utils"
import { 
  MessageSquarePlus, 
  Trash2, 
  MoreVertical, 
  Pencil, 
  PanelLeftClose, 
  PanelLeftOpen 
} from "lucide-react"

function useIsOverflowing(deps: React.DependencyList = []) {
  const ref = React.useRef<HTMLSpanElement | null>(null)
  const [isOverflowing, setIsOverflowing] = React.useState(false)

  const measure = React.useCallback(() => {
    const el = ref.current
    if (!el) return
    // scrollWidth > clientWidth indicates overflow for a single-line element
    setIsOverflowing(el.scrollWidth > el.clientWidth + 1)
  }, [])

  React.useLayoutEffect(() => {
    measure()

    const el = ref.current
    if (!el) return

    const ro = new ResizeObserver(() => measure())
    ro.observe(el)

    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { ref, isOverflowing, measure }
}

function SessionTitle({
  title,
  className,
}: {
  title: string
  className?: string
}) {
  const MAX_TITLE_CHARS = 12
  const codepoints = React.useMemo(() => Array.from(title), [title])
  const isCharTruncated = codepoints.length > MAX_TITLE_CHARS
  const displayTitle = isCharTruncated
    ? codepoints.slice(0, MAX_TITLE_CHARS).join("")
    : title

  const { ref, isOverflowing } = useIsOverflowing([displayTitle])

  return (
    <span className={cn("relative block min-w-0", className)}>
      <span
        ref={ref}
        className={cn(
          "block text-sm whitespace-nowrap overflow-hidden select-none pr-5",
          // Gemini-like fade out near the end of the visible region.
          // Note: we reserve right padding (pr-5) so the ellipsis sits on top cleanly.
          "[mask-image:linear-gradient(to_right,rgba(0,0,0,1)_0%,rgba(0,0,0,1)_74%,rgba(0,0,0,0)_96%)]",
          "[-webkit-mask-image:linear-gradient(to_right,rgba(0,0,0,1)_0%,rgba(0,0,0,1)_74%,rgba(0,0,0,0)_96%)]"
        )}
        title={title}
      >
        {displayTitle}
      </span>

      {(isOverflowing || isCharTruncated) && (
        <span
          className="absolute right-0 top-0 text-sm select-none pl-0.5"
          aria-hidden="true"
        >
          ...
        </span>
      )}
    </span>
  )
}

interface ChatSidebarProps {
  sessions: ChatSession[]
  currentSessionId: string | null
  onSelectSession: (id: string) => void
  onCreateSession: () => void
  onDeleteSession: (id: string) => void
  onRenameSession: (id: string, newTitle: string) => void
  isCollapsed: boolean
  onToggleCollapse: () => void
}

export function ChatSidebar({
  sessions,
  currentSessionId,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  onRenameSession,
  isCollapsed,
  onToggleCollapse,
}: ChatSidebarProps) {
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editValue, setEditValue] = React.useState("")
  const [menuOpenId, setMenuOpenId] = React.useState<string | null>(null)
  const menuRef = React.useRef<HTMLDivElement | null>(null)
  const renameInputRef = React.useRef<HTMLInputElement | null>(null)

  const handleStartRename = (session: ChatSession) => {
    setEditingId(session.id)
    setEditValue(session.title)
    setMenuOpenId(null)
  }

  const handleRenameSubmit = (id: string) => {
    if (editValue.trim()) {
      onRenameSession(id, editValue.trim())
    }
    setEditingId(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === "Enter") {
      handleRenameSubmit(id)
    } else if (e.key === "Escape") {
      setEditingId(null)
    }
  }

  React.useEffect(() => {
    if (!menuOpenId) return

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null
      if (!target) return
      if (menuRef.current?.contains(target)) return
      // Don't close on presses that start on any session menu button; let its click handler toggle.
      if (target instanceof Element && target.closest("[data-session-menu-button='true']")) return
      setMenuOpenId(null)
    }

    const onKeyDownGlobal = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpenId(null)
    }

    document.addEventListener("pointerdown", onPointerDown, true)
    document.addEventListener("keydown", onKeyDownGlobal)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true)
      document.removeEventListener("keydown", onKeyDownGlobal)
    }
  }, [menuOpenId])

  React.useEffect(() => {
    if (!editingId) return
    // Ensure focus even if autoFocus is skipped due to React timing.
    requestAnimationFrame(() => renameInputRef.current?.focus())
  }, [editingId])

  return (
    <div className={cn(
      "border-r bg-muted/20 flex flex-col h-full transition-all duration-300 ease-in-out relative group",
      isCollapsed ? "w-0 overflow-hidden md:w-16" : "w-64"
    )}>
      {/* Collapse/Expand Toggle (Gemini style) */}
      <div className={cn(
        "p-4 border-b flex items-center",
        isCollapsed ? "justify-center" : "justify-between"
      )}>
        {!isCollapsed && (
          <Button onClick={onCreateSession} className="flex-1 justify-start gap-2 mr-2" variant="default" size="sm">
            <MessageSquarePlus className="h-4 w-4" />
            <span className="truncate">New Chat</span>
          </Button>
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onToggleCollapse}
          className={cn("shrink-0", isCollapsed && "h-10 w-10")}
        >
          {isCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </Button>
      </div>

      {isCollapsed && (
        <div className="p-2 flex flex-col items-center gap-4">
           <Button onClick={onCreateSession} variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
            <MessageSquarePlus className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Collapsed sidebar should not allow selecting history items (Gemini-like). */}
      {!isCollapsed && (
        <ScrollArea className="flex-1">
          <div className={cn("p-2 space-y-2")}>
            {sessions.map((session) => (
              <div key={session.id} className="relative group px-2 mb-0.5">
                <div
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors relative w-full",
                    currentSessionId === session.id 
                      ? "bg-secondary text-secondary-foreground font-medium" 
                      : "text-muted-foreground hover:bg-secondary/50"
                  )}
                  onClick={() => onSelectSession(session.id)}
                >
                  <div className="flex-1 min-w-0">
                    {editingId === session.id ? (
                      <input
                        ref={renameInputRef}
                        autoFocus
                        className="bg-background border border-primary/30 outline-none text-sm w-full py-0 px-1 rounded shadow-sm"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleRenameSubmit(session.id)}
                        onKeyDown={(e) => handleKeyDown(e, session.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <SessionTitle title={session.title} />
                    )}
                  </div>

                  {/* 操作按钮：固定宽度列，永远不会被文字挤走 */} 
                  {editingId !== session.id && (
                    <div className="shrink-0 w-8 flex items-center justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-8 w-8 hover:bg-background/80",
                          // Make it easy to discover: show on hover, keep visible when menu is open or focused
                          menuOpenId === session.id
                            ? "opacity-100"
                            : "opacity-100 md:opacity-0 md:group-hover:!opacity-100 md:group-focus-within:!opacity-100"
                        )}
                        data-session-menu-button="true"
                        onClick={(e) => {
                          e.stopPropagation()
                          setMenuOpenId(menuOpenId === session.id ? null : session.id)
                        }}
                        aria-label="Open session menu"
                        aria-haspopup="menu"
                        aria-expanded={menuOpenId === session.id}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Action Menu (Simple version without Radix Dropdown) */}
                {menuOpenId === session.id && (
                  <div
                    ref={menuRef}
                    className="absolute right-0 mt-1 w-36 bg-popover border rounded-md shadow-lg z-20 py-1 text-sm"
                    role="menu"
                  >
                    <button
                      className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-accent text-left"
                      role="menuitem"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleStartRename(session)
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Rename
                    </button>
                    <button
                      className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-accent text-destructive text-left"
                      role="menuitem"
                      onClick={(e) => {
                        e.stopPropagation()
                        const ok = window.confirm("Delete this chat? This cannot be undone.")
                        if (ok) {
                          onDeleteSession(session.id)
                          setMenuOpenId(null)
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}

