"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { classNames } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import AgentAvatar, { SPRITE_KEYS, getAgentSprite } from "@/components/ui/AgentAvatar";

/* ── SVG Icons ─────────────────────────────────────────── */
function IconSwords({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  );
}
function IconTrophy({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0116.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a18.991 18.991 0 01-4.27.492 18.99 18.99 0 01-4.27-.493" />
    </svg>
  );
}
function IconDashboard({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}
function IconRobot({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M16 3v1.5m0 15V21m-8-12h8m-8 4h8m-11.25-6h14.5a2.25 2.25 0 012.25 2.25v8.5a2.25 2.25 0 01-2.25 2.25H4.75A2.25 2.25 0 012.5 15.75v-8.5A2.25 2.25 0 014.75 5z" />
    </svg>
  );
}
function IconBolt({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}
function IconBets({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function IconPlay({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
    </svg>
  );
}
function IconLogout({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
    </svg>
  );
}
function IconChevronDown({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

/* ── Avatar storage key ─────────────────────────────────── */
const AVATAR_KEY = "arena_avatar";

export default function Navbar() {
  const pathname = usePathname();
  const { isAuthenticated, user, logout, initialize } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { lang, setLang, t } = useLanguage();
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [avatarSprite, setAvatarSprite] = useState<string | null>(null);

  // Load saved avatar from localStorage (or derive from username)
  useEffect(() => {
    const saved = localStorage.getItem(AVATAR_KEY);
    if (saved && SPRITE_KEYS.includes(saved as any)) {
      setAvatarSprite(`/agents/${saved}.webp`);
    } else if (user?.username) {
      setAvatarSprite(getAgentSprite(user.username));
    }
  }, [user?.username]);

  const pickAvatar = (key: string) => {
    localStorage.setItem(AVATAR_KEY, key);
    setAvatarSprite(`/agents/${key}.webp`);
  };

  // Resolved sprite name for highlighting current selection
  const currentSpriteKey = SPRITE_KEYS.find(
    (k) => avatarSprite === `/agents/${k}.webp`
  );

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close user menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  const navLinks = [
    { href: "/matches", label: t.nav.matches, icon: <IconSwords /> },
    { href: "/bets", label: t.nav.bets, icon: <IconBets /> },
    { href: "/leaderboard", label: t.nav.leaderboard, icon: <IconTrophy /> },
    { href: "/docs", label: "API Docs", icon: <IconRobot /> },
  ];

  const authLinks = [
    { href: "/play", label: t.nav.play, icon: <IconPlay /> },
    { href: "/dashboard", label: t.nav.dashboard, icon: <IconDashboard /> },
    { href: "/agents", label: t.nav.myAgents, icon: <IconRobot /> },
    { href: "/matchmaking", label: t.nav.matchmaking, icon: <IconBolt /> },
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
          ? "bg-white/95 backdrop-blur-md border-b border-arena-border-light shadow-arena-sm"
          : "bg-transparent border-b border-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* ── Logo ──────────────────────────────────── */}
          <Link href="/" className="flex items-center group">
            <span className="text-arena-text-bright font-bold text-lg font-display">
              Alph<span className="text-arena-primary">Arena</span>
            </span>
          </Link>

          {/* ── Desktop Nav ───────────────────────────── */}
          <div className="hidden md:flex items-center gap-0.5">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={classNames(
                  "relative px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5",
                  isActive(link.href)
                    ? "text-arena-primary"
                    : "text-arena-muted hover:text-arena-text hover:bg-arena-card-hover"
                )}
              >
                <span className={isActive(link.href) ? "text-arena-primary" : "text-arena-muted-light"}>
                  {link.icon}
                </span>
                {link.label}
                {isActive(link.href) && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-arena-primary" />
                )}
              </Link>
            ))}
          </div>

          {/* ── Right section ─────────────────────────── */}
          <div className="hidden md:flex items-center gap-2.5">
            {/* Language Toggle */}
            <div className="inline-flex items-center bg-arena-bg-light border border-arena-border-light rounded-lg p-0.5 text-xs">
              <button
                onClick={() => setLang("en")}
                className={classNames(
                  "px-2 py-1 rounded-md font-semibold transition-all duration-200",
                  lang === "en"
                    ? "bg-white text-arena-primary shadow-sm"
                    : "text-arena-muted hover:text-arena-text"
                )}
              >
                EN
              </button>
              <button
                onClick={() => setLang("es")}
                className={classNames(
                  "px-2 py-1 rounded-md font-semibold transition-all duration-200",
                  lang === "es"
                    ? "bg-white text-arena-primary shadow-sm"
                    : "text-arena-muted hover:text-arena-text"
                )}
              >
                ES
              </button>
            </div>

            {isAuthenticated ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-arena-card-hover transition-all duration-200 border border-transparent hover:border-arena-border-light"
                >
                  {avatarSprite ? (
                    <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 agent-sprite" style={{ backgroundImage: `url('${avatarSprite}')` }} />
                  ) : (
                    <AgentAvatar name={user?.username || "U"} size="xs" rounded="rounded-lg" />
                  )}
                  <span className="text-sm font-medium text-arena-text-bright max-w-[100px] truncate">
                    {user?.username}
                  </span>
                  <IconChevronDown className={classNames("w-3.5 h-3.5 text-arena-muted transition-transform duration-200", userMenuOpen ? "rotate-180" : "")} />
                </button>

                {/* Dropdown */}
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-arena-border-light rounded-xl shadow-arena-lg overflow-hidden animate-fade-down" style={{ animationDuration: "0.15s" }}>
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-arena-border-light/60">
                      <div className="flex items-center gap-2.5">
                        {avatarSprite ? (
                          <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 agent-sprite" style={{ backgroundImage: `url('${avatarSprite}')` }} />
                        ) : (
                          <AgentAvatar name={user?.username || "U"} size="xs" rounded="rounded-lg" />
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-arena-text-bright truncate">{user?.username}</div>
                          <div className="text-[10px] text-arena-muted font-mono truncate">{user?.email || t.nav.signedInAs}</div>
                        </div>
                      </div>
                      {/* Avatar picker */}
                      <div className="flex items-center gap-1.5 mt-3">
                        {SPRITE_KEYS.map((key) => (
                          <button
                            key={key}
                            onClick={() => pickAvatar(key)}
                            className={classNames(
                              "w-7 h-7 rounded-md overflow-hidden agent-sprite transition-all",
                              currentSpriteKey === key
                                ? "ring-2 ring-arena-primary ring-offset-1 scale-110"
                                : "opacity-60 hover:opacity-100 hover:scale-105"
                            )}
                            style={{ backgroundImage: `url('/agents/${key}.webp')` }}
                            title={key}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Quick links */}
                    <div className="py-1.5">
                      {authLinks.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          className={classNames(
                            "flex items-center gap-2.5 px-4 py-2 text-sm transition-colors",
                            isActive(link.href)
                              ? "text-arena-primary bg-arena-primary/5"
                              : "text-arena-muted hover:text-arena-text hover:bg-arena-card-hover"
                          )}
                        >
                          {link.icon}
                          {link.label}
                        </Link>
                      ))}
                    </div>

                    {/* Logout */}
                    <div className="border-t border-arena-border-light/60 py-1.5">
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          logout();
                        }}
                        className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-arena-danger hover:bg-arena-danger/5 transition-colors"
                      >
                        <IconLogout className="w-4 h-4" />
                        {t.nav.logout}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm text-arena-muted hover:text-arena-text rounded-xl hover:bg-arena-card-hover transition-all font-medium"
                >
                  {t.nav.login}
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 text-sm bg-arena-primary hover:bg-arena-primary-dark text-white font-semibold rounded-xl transition-all shadow-arena-sm hover:shadow-arena"
                >
                  {t.nav.signUp}
                </Link>
              </div>
            )}
          </div>

          {/* ── Mobile Hamburger ──────────────────────── */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden w-10 h-10 rounded-xl flex items-center justify-center text-arena-muted hover:text-arena-text hover:bg-arena-card-hover transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* ── Mobile Menu ──────────────────────────────── */}
      <div
        className={classNames(
          "md:hidden overflow-hidden transition-all duration-300 ease-in-out",
          mobileOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="border-t border-arena-border-light bg-white/98 backdrop-blur-md">
          <div className="px-4 py-3 space-y-0.5">
            {/* Nav links */}
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={classNames(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                  isActive(link.href)
                    ? "bg-arena-primary/8 text-arena-primary"
                    : "text-arena-muted hover:text-arena-text hover:bg-arena-card-hover"
                )}
              >
                <span className={isActive(link.href) ? "text-arena-primary" : "text-arena-muted-light"}>
                  {link.icon}
                </span>
                {link.label}
                {isActive(link.href) && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-arena-primary" />
                )}
              </Link>
            ))}

            {/* Auth links */}
            {isAuthenticated && (
              <>
                <div className="h-px bg-arena-border-light/60 my-2" />
                {authLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={classNames(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                      isActive(link.href)
                        ? "bg-arena-primary/8 text-arena-primary"
                        : "text-arena-muted hover:text-arena-text hover:bg-arena-card-hover"
                    )}
                  >
                    <span className={isActive(link.href) ? "text-arena-primary" : "text-arena-muted-light"}>
                      {link.icon}
                    </span>
                    {link.label}
                    {isActive(link.href) && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-arena-primary" />
                    )}
                  </Link>
                ))}
              </>
            )}

            {/* Language toggle */}
            <div className="px-3 py-2.5">
              <div className="inline-flex items-center bg-arena-bg-light border border-arena-border-light rounded-lg p-0.5 text-xs">
                <button
                  onClick={() => setLang("en")}
                  className={classNames(
                    "px-3 py-1.5 rounded-md font-semibold transition-all",
                    lang === "en"
                      ? "bg-white text-arena-primary shadow-sm"
                      : "text-arena-muted hover:text-arena-text"
                  )}
                >
                  EN
                </button>
                <button
                  onClick={() => setLang("es")}
                  className={classNames(
                    "px-3 py-1.5 rounded-md font-semibold transition-all",
                    lang === "es"
                      ? "bg-white text-arena-primary shadow-sm"
                      : "text-arena-muted hover:text-arena-text"
                  )}
                >
                  ES
                </button>
              </div>
            </div>

            {/* Auth footer */}
            <div className="pt-2 border-t border-arena-border-light/60">
              {isAuthenticated ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    {avatarSprite ? (
                      <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 agent-sprite" style={{ backgroundImage: `url('${avatarSprite}')` }} />
                    ) : (
                      <AgentAvatar name={user?.username || "U"} size="xs" rounded="rounded-lg" />
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-arena-text-bright truncate">{user?.username}</div>
                      <div className="text-[10px] text-arena-muted">{t.nav.signedInAs}</div>
                    </div>
                  </div>
                  {/* Avatar picker (mobile) */}
                  <div className="flex items-center gap-1.5 px-3 py-2">
                    {SPRITE_KEYS.map((key) => (
                      <button
                        key={key}
                        onClick={() => pickAvatar(key)}
                        className={classNames(
                          "w-7 h-7 rounded-md overflow-hidden agent-sprite transition-all",
                          currentSpriteKey === key
                            ? "ring-2 ring-arena-primary ring-offset-1 scale-110"
                            : "opacity-60 hover:opacity-100 hover:scale-105"
                        )}
                        style={{ backgroundImage: `url('/agents/${key}.webp')` }}
                        title={key}
                      />
                    ))}
                  </div>
                  <button
                    onClick={logout}
                    className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-arena-danger hover:bg-arena-danger/5 rounded-xl transition-colors font-medium"
                  >
                    <IconLogout />
                    {t.nav.logout}
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 px-3 py-2">
                  <Link
                    href="/login"
                    className="flex-1 text-center px-4 py-2.5 text-sm text-arena-muted hover:text-arena-text rounded-xl border border-arena-border-light hover:bg-arena-card-hover transition-all font-medium"
                  >
                    {t.nav.login}
                  </Link>
                  <Link
                    href="/register"
                    className="flex-1 text-center px-4 py-2.5 text-sm bg-arena-primary hover:bg-arena-primary-dark text-white font-semibold rounded-xl shadow-arena-sm transition-all"
                  >
                    {t.nav.signUp}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
