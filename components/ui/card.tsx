import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: Readonly<React.HTMLAttributes<HTMLDivElement>>) {
  return <div className={cn("rounded-lg border border-border bg-background p-6 shadow-sm", className)} {...props} />;
}

export function Alert({
  className,
  tone = "info",
  ...props
}: Readonly<React.HTMLAttributes<HTMLElement> & { tone?: "info" | "success" | "error" }>) {
  const tones = {
    info: "border-blue-200 bg-blue-50 text-blue-900",
    success: "border-green-200 bg-green-50 text-green-900",
    error: "border-red-200 bg-red-50 text-red-900",
  };
  const classes = cn("block rounded-md border px-4 py-3 text-sm", tones[tone], className);
  // Errors interrupt (role alert); other messages are polite: <output> has the status role.
  if (tone === "error") return <div role="alert" className={classes} {...props} />;
  return <output className={classes} {...props} />;
}
