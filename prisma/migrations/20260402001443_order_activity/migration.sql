CREATE TABLE "public"."order_activity" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "content" "text",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "text",
    CONSTRAINT "order_activity_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "order_activity_note_content_check" CHECK (
        "type" <> 'note'
        OR (
            "content" IS NOT NULL
            AND "btrim"("content") <> ''::"text"
        )
    )
);

CREATE INDEX "idx_order_activity_order_created_at"
ON "public"."order_activity" USING "btree" ("order_id", "created_at" DESC);

ALTER TABLE ONLY "public"."order_activity"
    ADD CONSTRAINT "order_activity_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;
