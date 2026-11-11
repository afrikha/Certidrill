import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: Readonly<React.InputHTMLAttributes<HTMLInputElement>>) {
  return (
    <input
      className={cn(
        "block w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring",
        className,
      )}
      {...props}
    />
  );
}

/** A label is always tied to its control: htmlFor is required. */
export function Label({ className, htmlFor, ...props }: Readonly<React.LabelHTMLAttributes<HTMLLabelElement> & { htmlFor: string }>) {
  return <label htmlFor={htmlFor} className={cn("mb-1 block text-sm font-medium", className)} {...props} />;
}

export function Select({ className, ...props }: Readonly<React.SelectHTMLAttributes<HTMLSelectElement>>) {
  return (
    <select
      className={cn("block rounded-md border border-border bg-background px-3 py-2 text-sm", className)}
      {...props}
    />
  );
}
