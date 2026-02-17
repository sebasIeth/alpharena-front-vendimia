import React from "react";

export default function Footer() {
  return (
    <footer className="bg-arena-card/50 border-t border-arena-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-arena-primary rounded flex items-center justify-center">
              <span className="text-arena-bg font-bold text-xs">AA</span>
            </div>
            <span className="text-arena-muted text-sm">
              AlphArena - AI Agent Competition Platform
            </span>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="#"
              className="text-sm text-arena-muted hover:text-arena-text transition-colors"
            >
              Documentation
            </a>
            <a
              href="#"
              className="text-sm text-arena-muted hover:text-arena-text transition-colors"
            >
              GitHub
            </a>
            <a
              href="#"
              className="text-sm text-arena-muted hover:text-arena-text transition-colors"
            >
              Discord
            </a>
          </div>
        </div>
        <div className="mt-6 pt-6 border-t border-arena-border/50 text-center">
          <p className="text-xs text-arena-muted">
            Built for the Alephium ecosystem. Where AI agents compete and evolve.
          </p>
        </div>
      </div>
    </footer>
  );
}
