"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { motion } from "framer-motion";
import { memo, useCallback } from "react";
import { suggestions } from "@/lib/constants";
import type { ChatMessage } from "@/lib/types";
import { Suggestion } from "../ai-elements/suggestion";
import type { VisibilityType } from "./visibility-selector";

type SuggestedActionsProps = {
  chatId: string;
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  onSent?: () => void;
  /** When set, a click hands the text to the composer (pre-send check) instead of sending it directly. */
  onSelect?: (text: string) => void;
  selectedVisibilityType: VisibilityType;
};

const TIER_LABEL = {
  moderate: "Moderate example",
  strong: "Strong example",
  weak: "Weak example",
} as const;
const TIER_FILLED = { moderate: 2, strong: 3, weak: 1 } as const;
const TIER_COLOR = {
  moderate: "bg-orange-500",
  strong: "bg-emerald-500",
  weak: "bg-red-500",
} as const;
const SEGMENTS = [0, 1, 2];

/** The same 3-segment bar shown under rated prompts, so each example reads at a glance. */
function TierTag({ tier }: { tier: keyof typeof TIER_LABEL }) {
  return (
    <span className="mb-1.5 flex items-center gap-1.5 text-[10px] text-muted-foreground/70 uppercase tracking-wide">
      <span aria-hidden className="flex gap-0.5">
        {SEGMENTS.map((index) => (
          <span
            className={`h-1 w-3 rounded-full ${index < TIER_FILLED[tier] ? TIER_COLOR[tier] : "bg-muted-foreground/15"}`}
            key={index}
          />
        ))}
      </span>
      {TIER_LABEL[tier]}
    </span>
  );
}

function PureSuggestedActions({
  chatId,
  sendMessage,
  onSent,
  onSelect,
}: SuggestedActionsProps) {
  const suggestedActions = suggestions;
  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      if (onSelect) {
        onSelect(suggestion);
        return;
      }
      window.history.pushState(
        {},
        "",
        `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/chat/${chatId}`
      );
      sendMessage({
        parts: [{ text: suggestion, type: "text" }],
        role: "user",
      });
      onSent?.();
    },
    [chatId, sendMessage, onSent, onSelect]
  );

  return (
    <div
      className="flex w-full gap-2.5 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible"
      data-testid="suggested-actions"
      style={{
        msOverflowStyle: "none",
        scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {suggestedActions.map((suggestedAction, index) => (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="min-w-[200px] shrink-0 sm:min-w-0 sm:shrink sm:h-full"
          exit={{ opacity: 0, y: 16 }}
          initial={{ opacity: 0, y: 16 }}
          key={suggestedAction.text}
          transition={{
            delay: 0.06 * index,
            duration: 0.4,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <Suggestion
            className="h-full w-full items-start justify-start whitespace-nowrap rounded-xl border border-border/50 bg-card/30 px-4 py-3 text-left text-[12px] leading-relaxed text-muted-foreground transition-all duration-200 sm:whitespace-normal sm:p-4 sm:text-[13px] hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card/60 hover:text-foreground hover:shadow-[var(--shadow-card)]"
            onClick={handleSuggestionClick}
            suggestion={suggestedAction.text}
          >
            <span className="flex flex-col">
              <TierTag tier={suggestedAction.tier} />
              {suggestedAction.text}
            </span>
          </Suggestion>
        </motion.div>
      ))}
    </div>
  );
}

export const SuggestedActions = memo(
  PureSuggestedActions,
  (prevProps, nextProps) => {
    if (prevProps.chatId !== nextProps.chatId) {
      return false;
    }
    if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType) {
      return false;
    }

    return true;
  }
);
