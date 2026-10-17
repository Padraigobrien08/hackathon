// One demo chip runs against real models while everything else stays mocked (USE_MOCK=1).
// Chats started from it stay live for their follow-ups. Client memory only: a refresh drops it.
export const LIVE_SUGGESTION =
  "Make me a plan for launching our team newsletter";

const liveChats = new Set<string>();

export function markChatLive(chatId: string) {
  liveChats.add(chatId);
}

export function isChatLive(chatId: string) {
  return liveChats.has(chatId);
}
