import type { UserType } from "@/app/(auth)/auth";

type Entitlements = {
  maxMessagesPerHour: number;
};

// Reverse Alignment: the template's 10/hour cap blocks demo rehearsals and the live demo
// (judges use guest sessions). Raised for the hackathon; lower again before any public deploy.
const HACKATHON_MAX_MESSAGES_PER_HOUR = 500;

export const entitlementsByUserType: Record<UserType, Entitlements> = {
  guest: {
    maxMessagesPerHour: HACKATHON_MAX_MESSAGES_PER_HOUR,
  },
  regular: {
    maxMessagesPerHour: HACKATHON_MAX_MESSAGES_PER_HOUR,
  },
};
