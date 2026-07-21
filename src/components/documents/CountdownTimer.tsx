/** CountdownTimer: live countdown to an ISO expiry date, with a compact display mode. */
import { useState, useEffect } from "react";
import { Infinity } from "lucide-react";

export function CountdownTimer({
  expiresAt,
  compact = false,
}: {
  expiresAt: string | null;
  compact?: boolean;
}) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!expiresAt) return;
    const update = () =>
      setRemaining(Math.max(0, new Date(expiresAt).getTime() - Date.now()));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (!expiresAt) {
    return compact ? (
      <span className="inline-flex items-center gap-0.5 text-green-600 text-[11px] font-medium">
        <Infinity className="h-3 w-3" />
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-green-600 font-medium text-sm">
        <Infinity className="h-3.5 w-3.5" /> Vĩnh viễn
      </span>
    );
  }
  if (remaining === null) return null;
  if (remaining === 0) {
    return (
      <span
        className={`text-destructive font-medium ${compact ? "text-[11px]" : "text-sm"}`}
      >
        Hết hạn
      </span>
    );
  }

  const totalSecs = Math.floor(remaining / 1000);
  const days = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  const parts: string[] = [];
  if (!compact) {
    if (days > 0) parts.push(`${days}n`);
    if (hours > 0) parts.push(`${hours}g`);
    if (mins > 0) parts.push(`${mins}p`);
    parts.push(`${String(secs).padStart(2, "0")}s`);
  } else {
    // Compact: show only the two most significant time units.
    if (days > 0) parts.push(`${days}n${hours}g`);
    else if (hours > 0) parts.push(`${hours}g${String(mins).padStart(2, "0")}p`);
    else parts.push(`${mins}p${String(secs).padStart(2, "0")}s`);
  }

  const color =
    totalSecs < 3600
      ? "text-destructive"
      : totalSecs < 86400
        ? "text-amber-500"
        : "text-green-600";

  return (
    <span
      className={`font-mono font-semibold tabular-nums ${compact ? "text-[11px]" : "text-sm"} ${color}`}
    >
      {parts.join(" ")}
    </span>
  );
}
