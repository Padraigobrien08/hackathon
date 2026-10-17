CREATE TABLE "CoachInsight" (
	"assistantMessageId" uuid PRIMARY KEY NOT NULL,
	"chatId" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"decision" json NOT NULL,
	"scripted" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "CoachInsight" ADD CONSTRAINT "CoachInsight_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE cascade ON UPDATE no action;