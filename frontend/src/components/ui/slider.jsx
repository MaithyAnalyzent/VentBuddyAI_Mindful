import * as React from "react";
import { cn } from "@/lib/utils";

const Slider = React.forwardRef(
  ({ className, value = [0], onValueChange, min = 0, max = 100, step = 1, ...props }, ref) => (
    <input
      ref={ref}
      type="range"
      min={min}
      max={max}
      step={step}
      value={Array.isArray(value) ? value[0] : value}
      onChange={(event) => onValueChange?.([Number(event.target.value)])}
      className={cn("w-full accent-sage-400", className)}
      {...props}
    />
  )
);
Slider.displayName = "Slider";

export { Slider };
