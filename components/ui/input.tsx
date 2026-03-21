import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "w-full border border-input bg-background px-4 py-3 text-sm text-foreground transition-colors outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40 focus:border-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Input }
