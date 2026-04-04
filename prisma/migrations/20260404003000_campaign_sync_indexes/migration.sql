CREATE INDEX IF NOT EXISTS "idx_campaigns_meta_campaign_id"
ON "public"."campaigns" USING "btree" ("meta_campaign_id")
WHERE "meta_campaign_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_campaign_spend_campaign_date"
ON "public"."campaign_spend" USING "btree" ("campaign_id", "date");
