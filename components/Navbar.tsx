"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { classNames } from "@/lib/utils";

export default function Navbar() {
  const pathname = usePathname();
  const { isAuthenticated, user, logout, initialize } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/matches", label: "Matches" },
    { href: "/leaderboard", label: "Leaderboard" },
  ];

  const authLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/agents", label: "My Agents" },
    { href: "/matchmaking", label: "Matchmaking" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav className="bg-arena-card/80 backdrop-blur-md border-b border-arena-border sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-arena-primary rounded-lg flex items-center justify-center">
              <span className="text-arena-bg font-bold text-sm">AA</span>
            </div>
            <span className="text-arena-text font-bold text-lg hidden sm:block">
              AlphArena
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={classNames(
                  "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive(link.href)
                    ? "bg-arena-primary/10 text-arena-primary"
                    : "text-arena-muted hover:text-arena-text hover:bg-arena-card-hover"
                )}
              >
                {link.label}
              </Link>
            ))}
            {isAuthenticated &&
              authLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={classNames(
                    "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive(link.href)
                      ? "bg-arena-primary/10 text-arena-primary"
                      : "text-arena-muted hover:text-arena-text hover:bg-arena-card-hover"
                  )}
                >
                  {link.label}
                </Link>
              ))}
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-arena-muted">
                  {user?.username}
                </span>
                <button
                  onClick={logout}
                  className="px-3 py-1.5 text-sm text-arena-muted hover:text-arena-text rounded-lg hover:bg-arena-card-hover transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-3 py-1.5 text-sm text-arena-muted hover:text-arena-text rounded-lg hover:bg-arena-card-hover transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-1.5 text-sm bg-arena-primary hover:bg-arena-primary-dark text-arena-bg font-semibold rounded-lg transition-colors"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-arena-muted hover:text-arena-text p-2"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {mobileOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-arena-border bg-arena-card">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={classNames(
                  "block px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive(link.href)
                    ? "bg-arena-primary/10 text-arena-primary"
                    : "text-arena-muted hover:text-arena-text"
                )}
              >
                {link.label}
              </Link>
            ))}
            {isAuthenticated &&
              authLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={classNames(
                    "block px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive(link.href)
                      ? "bg-arena-primary/10 text-arena-primary"
                      : "text-arena-muted hover:text-arena-text"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            <div className="pt-2 border-t border-arena-border">
              {isAuthenticated ? (
                <>
                  <div className="px-3 py-2 text-sm text-arena-muted">
                    Signed in as {user?.username}
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      setMobileOpen(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-sm text-arena-accent hover:bg-arena-card-hover rounded-lg"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <div className="flex gap-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center px-3 py-2 text-sm text-arena-muted hover:text-arena-text rounded-lg hover:bg-arena-card-hover"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center px-3 py-2 text-sm bg-arena-primary text-arena-bg font-semibold rounded-lg"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
