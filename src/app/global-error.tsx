"use client";

import { useEffect } from "react";

// Last-resort fallback — only used if the ROOT LAYOUT itself throws (e.g.
// the app shell/sidebar crashes), which app/error.tsx can't catch since
// that boundary lives inside the layout it would need to replace. Next
// requires this file to render its own <html>/<body> for exactly that
// reason. Deliberately dependency-free (no Tailwind classes, no shared
// components) since whatever broke the root layout could plausibly be
// something those depend on too — plain inline styles only, so this has
// the best chance of actually rendering when everything else has failed.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[UI] Unhandled root layout error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f8fafc", color: "#0f172a" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div
            style={{
              maxWidth: 420,
              width: "100%",
              textAlign: "center",
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: 32,
            }}
          >
            <h1 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Something went wrong</h1>
            <p style={{ fontSize: 14, color: "#64748b", marginTop: 8 }}>
              {error.message || "The app failed to load. Please try again."}
            </p>
            <button
              onClick={reset}
              style={{
                marginTop: 20,
                padding: "8px 16px",
                fontSize: 14,
                fontWeight: 500,
                color: "#fff",
                background: "#4f46e5",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
