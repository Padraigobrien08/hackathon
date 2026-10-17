"use client";

type Props = {
  question: string;
  onJustAnswer: () => void;
};

const SEGMENTS = [0, 1, 2];

/** Same shape as the prompt bar, so the card reads as "this prompt rated weak". */
function WeakBar() {
  return (
    <span aria-hidden className="flex gap-0.5">
      {SEGMENTS.map((index) => (
        <span
          className={
            index === 0
              ? "h-1 w-4 rounded-full bg-red-500"
              : "h-1 w-4 rounded-full bg-muted-foreground/15"
          }
          key={index}
        />
      ))}
    </span>
  );
}

/**
 * Shown above the composer instead of sending a prompt rated weak. The draft stays in the box:
 * add the missing detail and send again, or "Just answer" sends it unchanged. Always skippable.
 */
export function AskBackCard({ question, onJustAnswer }: Props) {
  return (
    <aside
      aria-label="Before I answer"
      aria-live="polite"
      className="animate-[fade-up_0.25s_cubic-bezier(0.22,1,0.36,1)] rounded-xl border border-border/50 bg-card/80 px-4 py-3 shadow-[var(--shadow-card)] backdrop-blur-sm"
      data-testid="ask-back"
    >
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <WeakBar />
        <span>Before I answer</span>
      </div>
      <p className="mt-2 text-[13px] text-foreground leading-[1.55]">
        {question}
      </p>
      <div className="mt-3 flex items-center gap-3 text-[11px]">
        <span className="text-muted-foreground">
          Add it to your message below and send again.
        </span>
        <button
          className="ml-auto rounded-full border border-border/60 px-2.5 py-1 font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
          data-testid="ask-back-just-answer"
          onClick={onJustAnswer}
          type="button"
        >
          Just answer
        </button>
      </div>
    </aside>
  );
}

/** One quiet line while the prompt is checked before sending (~1.5s). */
export function AskBackChecking() {
  return (
    <div
      aria-live="polite"
      className="flex items-center gap-2 px-1 text-[11px] text-muted-foreground"
      data-testid="ask-back-checking"
      role="status"
    >
      <span aria-hidden className="flex animate-pulse gap-0.5">
        {SEGMENTS.map((index) => (
          <span
            className="h-1 w-4 rounded-full bg-muted-foreground/20"
            key={index}
          />
        ))}
      </span>
      Reading your prompt…
    </div>
  );
}
