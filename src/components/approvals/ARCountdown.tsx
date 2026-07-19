/** ARCountdown: live countdown timer for an access grant's expiry date. */
import { useState, useEffect } from "react";
import { Infinity } from "lucide-react";

// Live countdown display for an access grant's expiry; ticks every second and color-codes urgency.
export function ARCountdown({ expiresAt }: { expiresAt: string | null }) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!expiresAt) return;
    const update = () =>
      setRemaining(Math.max(0, new Date(expiresAt).getTime() - Date.now()));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (!expiresAt)
    return (
      <span className="inline-flex items-center gap-1 text-green-600 text-sm font-medium">
        <Infinity className="h-3.5 w-3.5" /> Vĩnh viễn
      </span>
    );
  if (remaining === null) return null;
  if (remaining === 0)
    return (
      <span className="text-destructive text-sm font-medium">Đã hết hạn</span>
    );

  const s = Math.floor(remaining / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}n`);
  if (h > 0) parts.push(`${h}g`);
  if (m > 0) parts.push(`${m}p`);
  parts.push(`${String(sec).padStart(2, "0")}s`);
  const color =
    s < 3600
      ? "text-destructive"
      : s < 86400
        ? "text-amber-500"
        : "text-foreground";
  return (
    <span className={`font-mono text-sm font-semibold tabular-nums ${color}`}>
      {parts.join(" ")}
    </span>
  );
}
