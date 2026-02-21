import React from "react";
import { classNames } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export default function Card({ children, className, hover = false, onClick }: CardProps) {
  return (
    <div
      className={classNames(
        "bg-arena-card border border-arena-border rounded-2xl p-6 shadow-arena-sm",
        hover && "hover:shadow-arena-glow hover:border-arena-primary/30 transition-all duration-300 cursor-pointer",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={classNames("mb-4", className)}>
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3 className={classNames("text-lg font-semibold text-arena-text", className)}>
      {children}
    </h3>
  );
}
