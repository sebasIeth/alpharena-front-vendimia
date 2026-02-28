"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/lib/i18n";

const STORAGE_KEY = "alpharena-tutorial-create-agent";

interface Step {
  target?: string;
  titleKey: keyof ReturnType<typeof useSteps>[number] extends never ? string : string;
  title: string;
  text: string;
  sub?: { text: string; href?: string };
  pos?: "top" | "bottom";
  modal?: boolean;
  cta?: string;
}

function useSteps() {
  const { t } = useLanguage();
  return [
    {
      modal: true,
      title: t.tutorial.welcomeTitle,
      text: t.tutorial.welcomeText,
      cta: t.tutorial.welcomeCta,
    },
    {
      target: "stepper",
      pos: "bottom" as const,
      title: t.tutorial.stepperTitle,
      text: t.tutorial.stepperText,
    },
    {
      target: "agent-name",
      pos: "bottom" as const,
      title: t.tutorial.nameTitle,
      text: t.tutorial.nameText,
    },
    {
      target: "selfclaw-key",
      pos: "bottom" as const,
      title: t.tutorial.keyTitle,
      text: t.tutorial.keyText,
      sub: {
        text: t.tutorial.keySub,
        href: "https://selfclaw.ai",
      },
    },
    {
      target: "verify-btn",
      pos: "top" as const,
      title: t.tutorial.verifyTitle,
      text: t.tutorial.verifyText,
    },
    {
      modal: true,
      title: t.tutorial.readyTitle,
      text: t.tutorial.readyText,
      cta: t.tutorial.readyCta,
    },
  ];
}

export default function OnboardingTutorial() {
  const { t } = useLanguage();
  const steps = useSteps();

  const [show, setShow] = useState(false);
  const [entered, setEntered] = useState(false);
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [fade, setFade] = useState(false);

  /* Show after a short delay if not completed before */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    const timer = setTimeout(() => {
      setShow(true);
      requestAnimationFrame(() => setEntered(true));
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  /* Measure target element rect */
  const measure = useCallback(() => {
    const s = steps[idx];
    if (!s?.target) {
      setRect(null);
      return;
    }
    const el = document.querySelector(`[data-tutorial="${s.target}"]`);
    setRect(el ? el.getBoundingClientRect() : null);
  }, [idx, steps]);

  useEffect(() => {
    if (!show) return;
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [show, idx, measure]);

  /* Complete & persist */
  const done = useCallback(() => {
    setFade(true);
    setTimeout(() => {
      setShow(false);
      localStorage.setItem(STORAGE_KEY, "1");
    }, 300);
  }, []);

  /* Navigate */
  const go = useCallback(
    (n: number) => {
      setFade(true);
      setTimeout(() => {
        setIdx(n);
        setFade(false);
      }, 200);
    },
    []
  );

  if (!show) return null;

  const s = steps[idx];
  const modal = !!s.modal || !rect;
  const PAD = 10;
  const visible = entered && !fade;

  /* ── Tooltip position ── */
  let tipStyle: React.CSSProperties;
  let arrowDir: "up" | "down" | null = null;
  let arrowLeft = 0;

  if (modal || !rect) {
    tipStyle = {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%,-50%)",
    };
  } else {
    const W = 320;
    const GAP = 14;
    const cx = rect.left + rect.width / 2;
    const tLeft = Math.max(16, Math.min(cx - W / 2, window.innerWidth - W - 16));
    arrowLeft = Math.max(20, Math.min(cx - tLeft, W - 20));

    if (s.pos === "top") {
      tipStyle = {
        position: "fixed",
        bottom: window.innerHeight - rect.top + GAP + PAD,
        left: tLeft,
        width: W,
      };
      arrowDir = "down";
    } else {
      tipStyle = {
        position: "fixed",
        top: rect.bottom + GAP + PAD,
        left: tLeft,
        width: W,
      };
      arrowDir = "up";
    }
  }

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* ── SVG backdrop with spotlight hole ── */}
      <svg
        className="absolute inset-0 w-full h-full"
        style={{ transition: "opacity 0.3s ease", opacity: visible ? 1 : 0 }}
      >
        <defs>
          <mask id="tut-mask">
            <rect width="100%" height="100%" fill="white" />
            {!modal && rect && (
              <rect
                x={rect.left - PAD}
                y={rect.top - PAD}
                width={rect.width + PAD * 2}
                height={rect.height + PAD * 2}
                rx="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.6)"
          mask="url(#tut-mask)"
        />
      </svg>

      {/* ── Glow ring around spotlighted element ── */}
      {!modal && rect && (
        <div
          className="absolute rounded-xl pointer-events-none"
          style={{
            left: rect.left - PAD,
            top: rect.top - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            boxShadow:
              "0 0 0 2px rgba(91,79,207,0.4), 0 0 24px rgba(91,79,207,0.15)",
            transition: "all 0.3s ease",
            opacity: visible ? 1 : 0,
          }}
        />
      )}

      {/* ── Tooltip / Modal card ── */}
      <div
        style={{
          ...tipStyle,
          transition: "opacity 0.3s ease, transform 0.3s ease",
          opacity: visible ? 1 : 0,
          zIndex: 1,
        }}
      >
        <div
          className={`relative bg-white rounded-2xl border border-arena-border-light/60 shadow-arena-lg ${
            modal ? "p-8 max-w-md w-[90vw]" : "p-5"
          }`}
        >
          {/* Arrow */}
          {arrowDir === "up" && (
            <div
              className="absolute -top-[7px] w-[14px] h-[14px] rotate-45 bg-white border-l border-t border-arena-border-light/60"
              style={{ left: arrowLeft - 7 }}
            />
          )}
          {arrowDir === "down" && (
            <div
              className="absolute -bottom-[7px] w-[14px] h-[14px] rotate-45 bg-white border-r border-b border-arena-border-light/60"
              style={{ left: arrowLeft - 7 }}
            />
          )}

          {/* Skip button (top-right) */}
          {idx < steps.length - 1 && (
            <button
              onClick={done}
              className="absolute top-4 right-5 text-[11px] text-arena-muted hover:text-arena-text transition-colors font-medium"
            >
              {t.tutorial.skip}
            </button>
          )}

          {/* Title */}
          <h3
            className={`font-display font-bold text-arena-text-bright pr-20 ${
              modal ? "text-xl mb-3" : "text-base mb-2"
            }`}
          >
            {s.title}
          </h3>

          {/* Body */}
          <p
            className={`text-arena-muted leading-relaxed ${
              modal ? "text-sm mb-6" : "text-xs mb-4"
            }`}
          >
            {s.text}
          </p>

          {/* Optional sub-text / link */}
          {s.sub && (
            <p className="text-xs mb-4">
              {s.sub.href ? (
                <a
                  href={s.sub.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-arena-primary hover:text-arena-primary-light underline underline-offset-2 transition-colors"
                >
                  {s.sub.text} &rarr;
                </a>
              ) : (
                <span className="text-arena-primary">{s.sub.text}</span>
              )}
            </p>
          )}

          {/* Footer: progress dots + navigation buttons */}
          <div className="flex items-center justify-between gap-3">
            {/* Progress dots */}
            <div className="flex items-center gap-1.5">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === idx
                      ? "w-5 bg-arena-primary"
                      : i < idx
                      ? "w-1.5 bg-arena-primary/40"
                      : "w-1.5 bg-arena-border-light"
                  }`}
                />
              ))}
              <span className="text-[10px] text-arena-muted font-mono ml-2">
                {idx + 1}/{steps.length}
              </span>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              {idx > 0 && !s.modal && (
                <button
                  onClick={() => go(idx - 1)}
                  className="px-3 py-1.5 text-xs font-medium text-arena-muted hover:text-arena-text transition-colors"
                >
                  {t.common.back}
                </button>
              )}
              <button
                onClick={() =>
                  idx >= steps.length - 1 ? done() : go(idx + 1)
                }
                className="px-5 py-2 bg-arena-primary text-white text-xs font-semibold rounded-xl hover:bg-arena-primary-dark transition-colors shadow-sm"
              >
                {s.cta || t.tutorial.next}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
