"use client"

import * as React from "react"
import { cn } from "@/shared/utils/utils"

/** Modern pill toggle switch: neutral when off, accent when on. */
function Switch({
  checked,
  onCheckedChange,
  className,
  ...props
}: Omit<React.ComponentProps<"button">, "onChange"> & {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      data-state={checked ? "checked" : "unchecked"}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full p-0.5 outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-50 cursor-pointer",
        checked ? "bg-accent" : "bg-line hover:bg-line-2",
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "block size-5 rounded-full bg-paper shadow-md transition-transform duration-200 pointer-events-none",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  )
}

export { Switch }
