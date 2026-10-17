import type { InferSelectModel } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  foreignKey,
  integer,
  json,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const user = pgTable("User", {
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  email: varchar("email", { length: 64 }).notNull(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  image: text("image"),
  isAnonymous: boolean("isAnonymous").notNull().default(false),
  name: text("name"),
  password: varchar("password", { length: 64 }),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type User = InferSelectModel<typeof user>;

export const chat = pgTable("Chat", {
  createdAt: timestamp("createdAt").notNull(),
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  title: text("title").notNull(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  visibility: varchar("visibility", { enum: ["public", "private"] })
    .notNull()
    .default("private"),
});

export type Chat = InferSelectModel<typeof chat>;

export const message = pgTable("Message_v2", {
  attachments: json("attachments").notNull(),
  chatId: uuid("chatId")
    .notNull()
    .references(() => chat.id),
  createdAt: timestamp("createdAt").notNull(),
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  parts: json("parts").notNull(),
  role: varchar("role").notNull(),
});

export type DBMessage = InferSelectModel<typeof message>;

export const vote = pgTable(
  "Vote_v2",
  {
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id),
    isUpvoted: boolean("isUpvoted").notNull(),
    messageId: uuid("messageId")
      .notNull()
      .references(() => message.id),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.chatId, table.messageId] }),
  })
);

export type Vote = InferSelectModel<typeof vote>;

export const document = pgTable(
  "Document",
  {
    content: text("content"),
    createdAt: timestamp("createdAt").notNull(),
    id: uuid("id").notNull().defaultRandom(),
    kind: varchar("text", { enum: ["text", "code", "image", "sheet"] })
      .notNull()
      .default("text"),
    title: text("title").notNull(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id, table.createdAt] }),
  })
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
  "Suggestion",
  {
    createdAt: timestamp("createdAt").notNull(),
    description: text("description"),
    documentCreatedAt: timestamp("documentCreatedAt").notNull(),
    documentId: uuid("documentId").notNull(),
    id: uuid("id").notNull().defaultRandom(),
    isResolved: boolean("isResolved").notNull().default(false),
    originalText: text("originalText").notNull(),
    suggestedText: text("suggestedText").notNull(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
  },
  (table) => ({
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
    pk: primaryKey({ columns: [table.id] }),
  })
);

export type Suggestion = InferSelectModel<typeof suggestion>;

export const stream = pgTable(
  "Stream",
  {
    chatId: uuid("chatId").notNull(),
    createdAt: timestamp("createdAt").notNull(),
    id: uuid("id").notNull().defaultRandom(),
  },
  (table) => ({
    chatRef: foreignKey({
      columns: [table.chatId],
      foreignColumns: [chat.id],
    }),
    pk: primaryKey({ columns: [table.id] }),
  })
);

export type Stream = InferSelectModel<typeof stream>;

// Reverse Alignment: one row per answered user prompt. Token counts are our own estimate
// (gpt-tokenizer), costs at GPT-6 Astra rates (lib/reverse-alignment/pricing.ts).
// No foreign keys on purpose: deleting a chat or regenerating a message must not be blocked by analytics rows.
export const promptMetric = pgTable("PromptMetric", {
  answerModel: varchar("answerModel", { length: 64 }).notNull(),
  assistantMessageId: uuid("assistantMessageId").notNull().unique(),
  // Worth-responding gate (not built yet): attemptNumber, gateDecision, taskId stay null until the gate
  // passes a decision to recordPromptMetric. A task runs from its first prompt to the first "answered" one;
  // "avg prompts until the AI could answer" = avg(attemptNumber) where gateDecision = 'answered'.
  attemptNumber: integer("attemptNumber"),
  chatId: uuid("chatId").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  // Filled in later by the prompt evaluator; null until then. Shape is the evaluator's to define.
  evaluatedAt: timestamp("evaluatedAt"),
  evaluation: json("evaluation"),
  gateDecision: varchar("gateDecision", { enum: ["answered", "needs_more"] }),
  historyTokens: integer("historyTokens").notNull(),
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  inputCostUsd: doublePrecision("inputCostUsd").notNull(),
  // promptTokens + historyTokens: roughly what an API bills as input (excludes the system prompt).
  inputTokens: integer("inputTokens").notNull(),
  outputCostUsd: doublePrecision("outputCostUsd").notNull(),
  outputTokens: integer("outputTokens").notNull(),
  pricingModel: varchar("pricingModel", { length: 64 }).notNull(),
  prompt: text("prompt").notNull(),
  promptTokens: integer("promptTokens").notNull(),
  taskId: uuid("taskId"),
  totalCostUsd: doublePrecision("totalCostUsd").notNull(),
  userId: uuid("userId").notNull(),
  userMessageId: uuid("userMessageId").notNull(),
});

export type PromptMetric = InferSelectModel<typeof promptMetric>;
