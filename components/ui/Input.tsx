"use client";

import React from "react";
import { classNames } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export default function Input({
  label,
  error,
  helperText,
  className,
  id,
  ...props
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-arena-text mb-1.5"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={classNames(
          "w-full px-4 py-2.5 bg-white border rounded-lg text-arena-text placeholder-arena-muted focus:outline-none focus:ring-2 focus:ring-arena-primary/30 focus:border-arena-primary transition-all duration-200",
          error ? "border-arena-danger" : "border-arena-border",
          className
        )}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-arena-danger">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-arena-muted">{helperText}</p>
      )}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  children: React.ReactNode;
}

export function Select({
  label,
  error,
  className,
  id,
  children,
  ...props
}: SelectProps) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-arena-text mb-1.5"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={classNames(
          "w-full px-4 py-2.5 bg-white border rounded-lg text-arena-text focus:outline-none focus:ring-2 focus:ring-arena-primary/30 focus:border-arena-primary transition-all duration-200",
          error ? "border-arena-danger" : "border-arena-border",
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p className="mt-1 text-sm text-arena-danger">{error}</p>
      )}
    </div>
  );
}
