import React from "react";
import { classNames, getStatusColor } from "@/lib/utils";

interface BadgeProps {
  status: string;
  className?: string;
}

export default function Badge({ status, className }: BadgeProps) {
  if (status === "completed") {
    return (
      <span
        style={{
          backgroundColor: "#dcfce7",
          color: "#000000",
          borderRadius: "9999px",
          padding: "1px 8px",
          fontSize: "0.7rem",
          fontWeight: 500,
          display: "inline-flex",
          alignItems: "center",
        }}
        className={className}
      >
        ✓ Completed
      </span>
    );
  }

  return (
    <span
      className={classNames(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize",
        getStatusColor(status),
        className
      )}
    >
      {(status || "unknown").replace(/_/g, " ")}
    </span>
  );
}
