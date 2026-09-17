import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export const Input = ({
  type = "text",
  className = "",
  ...props
}: InputProps) => {
  return (
    <input
      type={type}
      className={`px-4 py-2 w-full rounded border-2 shadow-md transition focus:outline-hidden focus:shadow-xs text-foreground placeholder:text-muted-foreground ${
        props["aria-invalid"]
          ? "border-destructive text-destructive shadow-xs shadow-destructive"
          : ""
      } ${className}`}
      {...props}
    />
  );
};
