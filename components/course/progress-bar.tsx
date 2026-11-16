import { cn } from "@/lib/utils";

/** Reading progress: a native <progress> with its visible text. */
export function ProgressBar({ read, total, label, text, className }: Readonly<{ read: number; total: number; label: string; text: string; className?: string }>) {
  return (
    <div className={cn("space-y-1", className)}>
      <progress value={read} max={Math.max(total, 1)} aria-label={label} className="course-progress h-2 w-full" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
