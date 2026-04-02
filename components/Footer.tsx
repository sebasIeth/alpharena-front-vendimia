"use client";

import React from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n";

/* ── SVG Icons ─────────────────────────────────────────── */
function IconHome({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}
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
function IconBook({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  );
}
function IconHeart({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  );
}

export default function Footer() {
  const { t } = useLanguage();

  const navLinks = [
    { href: "/", label: t.nav.home, icon: <IconHome /> },
    { href: "/matches", label: t.nav.matches, icon: <IconSwords /> },
    { href: "/leaderboard", label: t.nav.leaderboard, icon: <IconTrophy /> },
  ];

  const socialLinks = [
    {
      label: "GitHub",
      href: "https://github.com/AlphArena",
      icon: (
        <svg className="w-4.5 h-4.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
        </svg>
      ),
    },
    {
      label: "Discord",
      href: "https://discord.gg/alpharena",
      icon: (
        <svg className="w-4.5 h-4.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
        </svg>
      ),
    },
    {
      label: "X",
      href: "https://x.com/_alphaarena",
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
  ];

  return (
    <footer className="relative mt-auto overflow-hidden">
      {/* Gradient top border */}
      <div className="h-px bg-gradient-to-r from-transparent via-arena-primary/30 to-transparent" />

      <div className="relative bg-arena-bg-light">
        {/* Decorative orb */}
        <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-64 bg-arena-primary/[0.03] rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8">

            {/* ── Brand column ──────────────────────── */}
            <div className="md:col-span-4 flex flex-col items-center md:items-start">
              <Link href="/" className="flex items-center gap-2.5 group mb-4">
                <div className="w-9 h-9 bg-gradient-to-br from-arena-primary to-arena-primary-dark rounded-xl flex items-center justify-center shadow-arena-sm transition-all duration-300 group-hover:shadow-arena group-hover:scale-105">
                  <span className="text-white font-extrabold text-sm tracking-tight">A</span>
                </div>
                <span className="text-arena-text-bright font-bold text-lg font-display">
                  Alph<span className="text-arena-primary">Arena</span>
                </span>
              </Link>
              <p className="text-sm text-arena-muted text-center md:text-left leading-relaxed max-w-xs">
                {t.footer.tagline}
              </p>

              {/* Social icons */}
              <div className="flex gap-2.5 mt-6">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    aria-label={social.label}
                    className="w-11 h-11 rounded-xl bg-white border border-arena-border-light flex items-center justify-center text-arena-muted hover:text-white hover:bg-gradient-to-br hover:from-arena-primary hover:to-arena-primary-dark hover:border-transparent hover:shadow-arena-sm transition-all duration-300 hover:scale-105"
                  >
                    {social.icon}
                  </a>
                ))}
              </div>
            </div>

            {/* ── Navigation column ─────────────────── */}
            <div className="md:col-span-3 md:col-start-6 flex flex-col items-center md:items-start">
              <h4 className="text-xs font-bold text-arena-text-bright uppercase tracking-wider mb-4">
                {t.nav.home.charAt(0).toUpperCase() + t.nav.home.slice(1)}
              </h4>
              <ul className="space-y-2.5">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="group flex items-center gap-2.5 text-sm text-arena-muted hover:text-arena-primary transition-colors duration-200"
                    >
                      <span className="text-arena-muted-light group-hover:text-arena-primary transition-colors duration-200">
                        {link.icon}
                      </span>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* ── Resources column ──────────────────── */}
            <div className="md:col-span-3 flex flex-col items-center md:items-start">
              <h4 className="text-xs font-bold text-arena-text-bright uppercase tracking-wider mb-4">
                Resources
              </h4>
              <ul className="space-y-2.5">
                <li>
                  <Link
                    href="/docs"
                    className="group flex items-center gap-2.5 text-sm text-arena-muted hover:text-arena-primary transition-colors duration-200"
                  >
                    <span className="text-arena-muted-light group-hover:text-arena-primary transition-colors duration-200">
                      <IconBook />
                    </span>
                    {t.footer.docs}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/docs"
                    className="group flex items-center gap-2.5 text-sm text-arena-muted hover:text-arena-primary transition-colors duration-200"
                  >
                    <span className="text-arena-muted-light group-hover:text-arena-primary transition-colors duration-200">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                      </svg>
                    </span>
                    API
                  </Link>
                </li>
                <li>
                  <Link
                    href="/docs"
                    className="group flex items-center gap-2.5 text-sm text-arena-muted hover:text-arena-primary transition-colors duration-200"
                  >
                    <span className="text-arena-muted-light group-hover:text-arena-primary transition-colors duration-200">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                      </svg>
                    </span>
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* ── Bottom bar ──────────────────────────── */}
          <div className="mt-12 pt-6 border-t border-arena-border-light/60">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-arena-muted">
                {t.footer.copyright}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-arena-muted">
                <span>Made with</span>
                <IconHeart className="w-3.5 h-3.5 text-arena-primary" />
                <span>for Alephium</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
