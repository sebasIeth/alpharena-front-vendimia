import React from "react";
import { classNames } from "@/lib/utils";

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export function Table({ children, className }: TableProps) {
  return (
    <div className={classNames("overflow-x-auto", className)}>
      <table className="w-full text-sm text-left">
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children }: { children: React.ReactNode }) {
  return (
    <thead className="text-xs uppercase text-arena-muted bg-arena-bg/60 border-b border-arena-border">
      {children}
    </thead>
  );
}

export function TableRow({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <tr
      className={classNames(
        "border-b border-arena-border/50 text-arena-text",
        onClick && "hover:bg-arena-primary/5 cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

export function TableHead({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th className={classNames("px-4 py-3 font-medium", className)}>
      {children}
    </th>
  );
}

export function TableCell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={classNames("px-4 py-3", className)}>
      {children}
    </td>
  );
}
