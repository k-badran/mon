import { settledContentFailures } from "@/lib/site/theme";

/**
 * Says on the page, in development, that the CMS could not be reached.
 *
 * The failure this exists for is a quiet one: `fetchSiteContent` resolves to
 * an empty map, every slot reads as undefined, and the page renders its frame
 * with nothing inside it. HTTP 200, no error, no clue. Someone looking at that
 * screen reasonably concludes the stylesheet is broken.
 *
 * Development only. In production a CMS outage must leave the marketing site
 * standing, so nothing is shown there and the server log carries it instead.
 */
export async function ContentLoadBanner() {
  // Next inlines NODE_ENV, so a production build drops this whole component's
  // body rather than merely skipping it at runtime.
  if (process.env.NODE_ENV === "production") return null;

  const failures = await settledContentFailures();

  if (failures.length === 0) return null;

  // Two components asking for the same section report it once.
  const seen = new Map(failures.map((failure) => [`${failure.section}|${failure.url}`, failure]));

  return (
    <div
      role="alert"
      /**
       * Deliberately styled with literal values rather than the design
       * tokens. The symptom this reports on is indistinguishable from a
       * stylesheet that failed to load, so the message about it must not
       * depend on the stylesheet having loaded.
       */
      dir="ltr"
      style={{
        position: "fixed",
        insetInlineStart: 0,
        insetInlineEnd: 0,
        top: 0,
        zIndex: 2147483647,
        background: "#7f1d1d",
        color: "#fef2f2",
        font: '13px/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
        padding: "10px 16px",
        borderBottom: "3px solid #ef4444",
        boxShadow: "0 4px 16px rgba(0,0,0,.35)",
        maxHeight: "40vh",
        overflowY: "auto",
      }}
    >
      <strong style={{ display: "block", fontSize: "14px" }}>
        CMS content could not be loaded — this page is rendering empty slots.
      </strong>

      <ul style={{ margin: "8px 0 0", padding: 0, listStyle: "none", display: "grid", gap: "6px" }}>
        {[...seen.values()].map((failure) => (
          <li key={`${failure.section}|${failure.url}`}>
            <span style={{ color: "#fca5a5" }}>{failure.section}</span> — {failure.reason}
            <br />
            <span style={{ opacity: 0.75, wordBreak: "break-all" }}>{failure.url}</span>
          </li>
        ))}
      </ul>

      <p style={{ margin: "10px 0 0", opacity: 0.8 }}>
        Shown in development only. In production the page still renders with whatever copy it
        has, and this is written to the server log as <code>[site-content]</code>.
      </p>
    </div>
  );
}
