import type { RiskBandLevel } from "@/lib/api";
import { levelColor, sparkHeights } from "@/lib/cockpit";

// Tiny drift sparkline for a queue row: a fixed set of bars coloured by risk level.
export function Sparkline({
  values,
  level,
}: {
  values: number[];
  level: RiskBandLevel;
}) {
  const heights = sparkHeights(values);
  const color = levelColor(level);
  return (
    <div
      role="img"
      aria-label="drift sparkline"
      className="flex h-[30px] w-12 flex-none items-end gap-[3px]"
    >
      {heights.map((h, i) => (
        <span
          key={i}
          data-testid="spark-bar"
          className="min-h-[3px] flex-1 rounded-sm"
          style={{ height: `${h}%`, background: color }}
        />
      ))}
    </div>
  );
}
