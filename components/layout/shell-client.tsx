"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Menu, X, Sparkles } from "lucide-react";

export function ShellClient({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <style>{`
        .mobile-topbar {
          display: none;
          height: 56px;
          background: var(--card);
          border-bottom: 1px solid var(--border);
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          flex-shrink: 0;
        }
        .mobile-backdrop {
          display: none;
        }
        .shell-main-offset {
          padding-top: 0;
        }

        @media (max-width: 1023px) {
          .mobile-topbar { display: flex; }
          .mobile-backdrop { display: block; }
        }
      `}</style>

      <div style={{ height: "100%", display: "flex", overflow: "hidden" }}>
        <Sidebar isOpen={isOpen} onClose={() => setIsOpen(false)} />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, height: "100%" }}>
          {/* Mobile topbar */}
          <header className="mobile-topbar">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: "linear-gradient(135deg, var(--primary), var(--accent))",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Sparkles size={13} color="white" />
              </div>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600 }}>
                Lamees
              </span>
            </div>

            <button
              onClick={() => setIsOpen((v) => !v)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "var(--foreground)", padding: 6, borderRadius: 8,
                display: "flex", alignItems: "center",
              }}
              aria-label={isOpen ? "Close menu" : "Open menu"}
            >
              {isOpen ? <X size={20} /> : <Menu size={22} />}
            </button>
          </header>

          {/* Page content */}
          <main style={{ flex: 1, overflowY: "auto" }}>
            {children}
          </main>
        </div>

        {/* Backdrop — rendered outside the column so it covers full screen */}
        {isOpen && (
          <div
            className="mobile-backdrop"
            onClick={() => setIsOpen(false)}
            style={{
              position: "fixed", inset: 0, zIndex: 30,
              background: "rgba(0,0,0,0.35)",
              backdropFilter: "blur(2px)",
            }}
          />
        )}
      </div>
    </>
  );
}