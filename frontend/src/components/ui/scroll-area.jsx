import * as React from "react";
import { cn } from "@/lib/utils";

const ScrollArea = React.forwardRef(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn("overflow-auto", className)} {...props}>
    {children}
  </div>
));
ScrollArea.displayName = "ScrollArea";

const ScrollBar = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={className} {...props} />
));
ScrollBar.displayName = "ScrollBar";

export { ScrollArea, ScrollBar };
