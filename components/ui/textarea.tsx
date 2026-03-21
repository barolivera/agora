import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "w-full border border-input bg-background px-4 py-3 text-sm text-foreground transition-colors outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40 focus:border-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
