import * as React from "react";
import { cn } from "@/lib/utils";

const variants = {
  primary: "bg-primary text-primary-foreground hover:bg-blue-800",
  secondary: "border border-border bg-background hover:bg-muted",
  ghost: "hover:bg-muted",
  danger: "bg-danger text-white hover:bg-red-800",
} as const;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
}

export function Button({ className, variant = "primary", type = "button", ...props }: Readonly<ButtonProps>) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

export function buttonClasses(variant: keyof typeof variants = "primary", className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
    variants[variant],
    className,
  );
}
