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
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
    <nav
      className={classNames(
        "sticky top-0 z-40 transition-all duration-300",
        scrolled
          ? "bg-arena-bg/80 backdrop-blur-xl border-b border-arena-border/50 shadow-arena-sm"
          : "bg-transparent border-b border-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-arena-primary/10 border border-arena-primary/30 rounded-xl flex items-center justify-center group-hover:shadow-arena-glow transition-all duration-300">
              <span className="text-arena-primary font-bold text-sm">AA</span>
            </div>
            <span className="text-arena-text-bright font-bold text-lg hidden sm:block">
              Alph<span className="text-arena-primary">Arena</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={classNames(
                  "px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive(link.href)
                    ? "bg-arena-primary/10 text-arena-primary"
                    : "text-arena-muted hover:text-arena-text hover:bg-arena-card/50"
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
                    "px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                    isActive(link.href)
                      ? "bg-arena-primary/10 text-arena-primary"
                      : "text-arena-muted hover:text-arena-text hover:bg-arena-card/50"
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
                <span className="text-sm text-arena-muted font-medium">
                  {user?.username}
                </span>
                <button
                  onClick={logout}
                  className="px-3 py-1.5 text-sm text-arena-muted hover:text-arena-text rounded-xl hover:bg-arena-card/50 transition-all"
                >
                  Logout
                </button>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-3 py-1.5 text-sm text-arena-muted hover:text-arena-text rounded-xl hover:bg-arena-card/50 transition-all"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-1.5 text-sm bg-arena-primary hover:bg-arena-primary-dark text-arena-bg font-semibold rounded-xl transition-all shadow-arena-glow hover:shadow-arena-glow-strong"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-arena-muted hover:text-arena-text p-2 rounded-xl hover:bg-arena-card/50 transition-all"
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
        <div className="md:hidden border-t border-arena-border/50 bg-arena-bg/95 backdrop-blur-xl">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={classNames(
                  "block px-3 py-2 rounded-xl text-sm font-medium transition-all",
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
                    "block px-3 py-2 rounded-xl text-sm font-medium transition-all",
                    isActive(link.href)
                      ? "bg-arena-primary/10 text-arena-primary"
                      : "text-arena-muted hover:text-arena-text"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            <div className="pt-2 border-t border-arena-border/50">
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
                    className="block w-full text-left px-3 py-2 text-sm text-arena-danger hover:bg-arena-card rounded-xl"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <div className="flex gap-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center px-3 py-2 text-sm text-arena-muted hover:text-arena-text rounded-xl hover:bg-arena-card"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center px-3 py-2 text-sm bg-arena-primary text-arena-bg font-semibold rounded-xl"
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
