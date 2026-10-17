"use client";

type Props = {
  question: string;
  onJustAnswer: () => void;
};

/** Shown above the composer instead of sending a prompt too thin to answer well. Always skippable. */
export function ClarifyPrompt({ question, onJustAnswer }: Props) {
  return (
    <aside
      aria-label="Before I answer"
      aria-live="polite"
      className="animate-[fade-up_0.25s_cubic-bezier(0.22,1,0.36,1)] rounded-lg border border-border/60 bg-muted/15 px-3.5 py-3"
      data-testid="clarify-prompt"
    >
      <p className="text-[13px] text-foreground/80 leading-[1.55]">
        <span className="font-medium text-foreground">Before I answer: </span>
        {question}
      </p>
      <div className="mt-3 flex items-center gap-3 border-border/50 border-t pt-2.5 text-[11px]">
        <span className="text-muted-foreground">
          Add it to your message below and send again.
        </span>
        <button
          className="ml-auto font-medium text-foreground/80 transition-colors hover:text-foreground"
          onClick={onJustAnswer}
          type="button"
        >
          Just answer
        </button>
      </div>
    </aside>
  );
}
