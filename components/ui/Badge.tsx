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
        className={classNames(
          "inline-flex items-center px-2 py-0.5 rounded-full text-[0.7rem] font-medium bg-green-100 text-green-800",
          className
        )}
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
