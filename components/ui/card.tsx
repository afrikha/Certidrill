import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-lg border border-border bg-background p-6 shadow-sm", className)} {...props} />;
}

export function Alert({
  className,
  tone = "info",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { tone?: "info" | "success" | "error" }) {
  const tones = {
    info: "border-blue-200 bg-blue-50 text-blue-900",
    success: "border-green-200 bg-green-50 text-green-900",
    error: "border-red-200 bg-red-50 text-red-900",
  };
  return <div role={tone === "error" ? "alert" : "status"} className={cn("rounded-md border px-4 py-3 text-sm", tones[tone], className)} {...props} />;
}
