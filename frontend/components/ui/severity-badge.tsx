import * as React from "react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

// Tone -> the semantic status CSS variables defined in globals.css. Colours come
// from the tokens; only structural sizing/shape is Tailwind. The risk bands map
// low -> success (green), medium -> warning (amber), high -> danger (red).
export type SeverityTone = "info" | "success" | "warning" | "danger" | "neutral"

const TONE_VARS: Record<
  SeverityTone,
  { bg: string; border: string; text: string }
> = {
  info: {
    bg: "var(--color-background-info)",
    border: "var(--color-border-info)",
    text: "var(--color-text-info)",
  },
  success: {
    bg: "var(--color-background-success)",
    border: "var(--color-border-success)",
    text: "var(--color-text-success)",
  },
  warning: {
    bg: "var(--color-background-warning)",
    border: "var(--color-border-warning)",
    text: "var(--color-text-warning)",
  },
  danger: {
    bg: "var(--color-background-danger)",
    border: "var(--color-border-danger)",
    text: "var(--color-text-danger)",
  },
  neutral: {
    bg: "var(--secondary)",
    border: "var(--border)",
    text: "var(--muted-foreground)",
  },
}

export type SeverityBadgeSize = "sm" | "md"

export interface SeverityBadgeProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "color"> {
  tone: SeverityTone
  label: string
  icon?: LucideIcon
  size?: SeverityBadgeSize
}

const STRUCTURAL_BASE_CLASS =
  "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium"

const SIZE_CLASS: Record<SeverityBadgeSize, string> = {
  sm: "text-[11px] px-1.5 py-px gap-1",
  md: "",
}

const ICON_SIZE: Record<SeverityBadgeSize, number> = { sm: 12, md: 14 }

export function SeverityBadge({
  tone,
  label,
  icon: Icon,
  size = "md",
  className,
  style,
  ...rest
}: SeverityBadgeProps) {
  const vars = TONE_VARS[tone]
  return (
    <span
      {...rest}
      className={cn(STRUCTURAL_BASE_CLASS, SIZE_CLASS[size], className)}
      style={{
        background: vars.bg,
        borderColor: vars.border,
        color: vars.text,
        ...style,
      }}
    >
      {Icon ? <Icon size={ICON_SIZE[size]} aria-hidden /> : null}
      <span>{label}</span>
    </span>
  )
}
