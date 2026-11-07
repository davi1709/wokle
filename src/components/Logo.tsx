/**
 * WOKLE wordmark. The "O" is a purple ring with a dot: part eye (awareness),
 * part globe, part target. Pure text + CSS, so it scales crisply and needs no
 * image assets.
 */
export function Logo({ size = "md" }: { size?: "md" | "xl" }) {
  const text = size === "xl" ? "text-6xl sm:text-8xl" : "text-2xl";
  const ring = size === "xl" ? "h-[0.62em] w-[0.62em] border-[0.11em]" : "h-[0.62em] w-[0.62em] border-[0.12em]";
  const dot = size === "xl" ? "h-[0.15em] w-[0.15em]" : "h-[0.16em] w-[0.16em]";
  return (
    <span
      aria-label="WOKLE"
      className={`font-display inline-flex items-baseline font-black tracking-tight ${text}`}
    >
      <span aria-hidden>W</span>
      <span
        aria-hidden
        className={`mx-[0.03em] inline-flex translate-y-[0.02em] items-center justify-center self-center rounded-full border-accent ${ring}`}
      >
        <span className={`rounded-full bg-accent ${dot}`} />
      </span>
      <span aria-hidden>KLE</span>
    </span>
  );
}
