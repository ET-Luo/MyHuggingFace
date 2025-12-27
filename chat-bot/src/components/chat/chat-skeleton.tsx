"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted/70 dark:bg-muted/40", className)}
      aria-hidden="true"
    />
  )
}

export function SidebarSkeleton({ isCollapsed }: { isCollapsed: boolean }) {
  return (
    <div
      className={cn(
        "border-r bg-muted/20 flex flex-col h-full transition-all duration-300 ease-in-out",
        isCollapsed ? "w-0 overflow-hidden md:w-16" : "w-64"
      )}
      aria-label="Loading chat history"
    >
      <div
        className={cn(
          "p-4 border-b flex items-center",
          isCollapsed ? "justify-center" : "justify-between"
        )}
      >
        {!isCollapsed && <Skeleton className="h-8 flex-1 mr-2 rounded-lg" />}
        <Skeleton className={cn("h-10 w-10 rounded-md", isCollapsed && "rounded-full")} />
      </div>

      {isCollapsed ? (
        <div className="p-2 flex flex-col items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      ) : (
        <div className="p-2 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="px-2">
              <Skeleton className={cn("h-10 w-full rounded-lg", i % 3 === 0 && "w-[85%]")} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function ChatListSkeleton() {
  return (
    <div className="flex-1 relative overflow-hidden">
      <div className="flex flex-col max-w-3xl mx-auto p-4 pb-32">
        {/* Contentful text to stabilize LCP (Gemini-like welcome) */}
        <div className="py-10 text-center text-muted-foreground">
          <div className="text-2xl font-semibold text-foreground">Welcome</div>
          <div className="mt-2 text-sm">Loading your chats…</div>
        </div>

        {/* Gemini-like: a couple of assistant bubbles + one user bubble */}
        <div className="flex items-start gap-3 mb-6">
          <Skeleton className="h-8 w-8 rounded-full mt-1" />
          <Skeleton className="h-16 w-[72%] rounded-2xl" />
        </div>
        <div className="flex items-start justify-end gap-3 mb-6">
          <Skeleton className="h-12 w-[55%] rounded-2xl" />
          <Skeleton className="h-8 w-8 rounded-full mt-1" />
        </div>
        <div className="flex items-start gap-3 mb-6">
          <Skeleton className="h-8 w-8 rounded-full mt-1" />
          <Skeleton className="h-24 w-[78%] rounded-2xl" />
        </div>
      </div>
    </div>
  )
}


