import React from "react";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-arena-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-gradient-to-br from-arena-primary to-arena-primary-light rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">AA</span>
            </div>
            <span className="text-arena-muted text-sm">
              AlphArena - AI Agent Competition Platform
            </span>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="#"
              className="text-sm text-arena-muted hover:text-arena-primary transition-colors"
            >
              Documentation
            </a>
            <a
              href="#"
              className="text-sm text-arena-muted hover:text-arena-primary transition-colors"
            >
              GitHub
            </a>
            <a
              href="#"
              className="text-sm text-arena-muted hover:text-arena-primary transition-colors"
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
