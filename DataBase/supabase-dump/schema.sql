


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."alert_priority_type" AS ENUM (
    'high',
    'med',
    'low'
);


ALTER TYPE "public"."alert_priority_type" OWNER TO "postgres";


CREATE TYPE "public"."alert_status_type" AS ENUM (
    'sent',
    'failed',
    'retried'
);


ALTER TYPE "public"."alert_status_type" OWNER TO "postgres";


CREATE TYPE "public"."budget_status_enum" AS ENUM (
    'unknown',
    'mentioned',
    'constrained',
    'aligned'
);


ALTER TYPE "public"."budget_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."channel_type" AS ENUM (
    'wa',
    'ig',
    'fb'
);


ALTER TYPE "public"."channel_type" OWNER TO "postgres";


CREATE TYPE "public"."clarity_level_enum" AS ENUM (
    'none',
    'partial',
    'clear'
);


ALTER TYPE "public"."clarity_level_enum" OWNER TO "postgres";


CREATE TYPE "public"."followup_status_type" AS ENUM (
    'scheduled',
    'sent',
    'canceled',
    'rescheduled'
);


ALTER TYPE "public"."followup_status_type" OWNER TO "postgres";


CREATE TYPE "public"."funnel_stage_source_enum" AS ENUM (
    'agent',
    'human',
    'system'
);


ALTER TYPE "public"."funnel_stage_source_enum" OWNER TO "postgres";


CREATE TYPE "public"."lead_stage_type" AS ENUM (
    'new',
    'qualified',
    'quote',
    'won',
    'lost'
);


ALTER TYPE "public"."lead_stage_type" OWNER TO "postgres";


CREATE TYPE "public"."objection_severity_enum" AS ENUM (
    'low',
    'medium',
    'high'
);


ALTER TYPE "public"."objection_severity_enum" OWNER TO "postgres";


CREATE TYPE "public"."objection_status_enum" AS ENUM (
    'active',
    'resolved',
    'ignored'
);


ALTER TYPE "public"."objection_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."order_status_enum" AS ENUM (
    'draft',
    'quoted',
    'pending_payment',
    'payment_review',
    'confirmed',
    'in_design',
    'in_production',
    'ready',
    'shipped',
    'completed',
    'cancelled'
);


ALTER TYPE "public"."order_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."payment_receipt_source_enum" AS ENUM (
    'automation',
    'manual_crm'
);


ALTER TYPE "public"."payment_receipt_source_enum" OWNER TO "postgres";


CREATE TYPE "public"."payment_receipt_status_enum" AS ENUM (
    'pending_validation',
    'validated',
    'rejected',
    'cancelled',
    'soft_deleted'
);


ALTER TYPE "public"."payment_receipt_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."provider_type" AS ENUM (
    'ycloud',
    'chatwoot'
);


ALTER TYPE "public"."provider_type" OWNER TO "postgres";


CREATE TYPE "public"."qualification_level_enum" AS ENUM (
    'none',
    'low',
    'medium',
    'high'
);


ALTER TYPE "public"."qualification_level_enum" OWNER TO "postgres";


CREATE TYPE "public"."quote_readiness_enum" AS ENUM (
    'no',
    'partial',
    'yes'
);


ALTER TYPE "public"."quote_readiness_enum" OWNER TO "postgres";


CREATE TYPE "public"."risk_level_enum" AS ENUM (
    'low',
    'medium',
    'high'
);


ALTER TYPE "public"."risk_level_enum" OWNER TO "postgres";


CREATE TYPE "public"."sender_type" AS ENUM (
    'customer',
    'human',
    'agent',
    'system'
);


ALTER TYPE "public"."sender_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_funnel_stage_transition"("p_lead_thread_id" "uuid", "p_to_stage" "public"."lead_stage_type", "p_source" "public"."funnel_stage_source_enum", "p_confidence" numeric, "p_reason" "text", "p_changed_by" "text" DEFAULT NULL::"text", "p_message_id" "uuid" DEFAULT NULL::"uuid", "p_assessment_id" "uuid" DEFAULT NULL::"uuid", "p_evidence_excerpt" "text" DEFAULT NULL::"text", "p_evidence_json" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_current_stage public.lead_stage_type;
  v_stage_locked boolean;
BEGIN
  SELECT lead_stage, stage_locked
  INTO v_current_stage, v_stage_locked
  FROM public.lead_threads
  WHERE id = p_lead_thread_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'lead_thread % no existe', p_lead_thread_id;
  END IF;

  IF v_stage_locked = true AND p_source <> 'human' THEN
    RAISE EXCEPTION 'lead_thread % tiene la etapa bloqueada manualmente', p_lead_thread_id;
  END IF;

  IF v_current_stage = p_to_stage THEN
    RETURN;
  END IF;

  UPDATE public.funnel_stage_history
  SET
    exited_at = now(),
    duration_seconds = EXTRACT(EPOCH FROM (now() - entered_at))::integer
  WHERE lead_thread_id = p_lead_thread_id
    AND exited_at IS NULL;

  UPDATE public.lead_threads
  SET
    lead_stage = p_to_stage,
    stage_source = p_source,
    stage_confidence = p_confidence,
    stage_reason = p_reason,
    stage_evidence = COALESCE(p_evidence_json, '{}'::jsonb),
    updated_at = now(),
    last_agent_assessment_at = CASE WHEN p_source = 'agent' THEN now() ELSE last_agent_assessment_at END,
    last_human_override_at = CASE WHEN p_source = 'human' THEN now() ELSE last_human_override_at END
  WHERE id = p_lead_thread_id;

  INSERT INTO public.funnel_stage_history (
    lead_thread_id,
    stage,
    from_stage,
    to_stage,
    entered_at,
    reason,
    source,
    confidence,
    changed_by,
    message_id,
    assessment_id,
    evidence_excerpt,
    evidence_json
  )
  VALUES (
    p_lead_thread_id,
    p_to_stage::text,
    v_current_stage,
    p_to_stage,
    now(),
    p_reason,
    p_source,
    p_confidence,
    p_changed_by,
    p_message_id,
    p_assessment_id,
    p_evidence_excerpt,
    COALESCE(p_evidence_json, '{}'::jsonb)
  );
END;
$$;


ALTER FUNCTION "public"."apply_funnel_stage_transition"("p_lead_thread_id" "uuid", "p_to_stage" "public"."lead_stage_type", "p_source" "public"."funnel_stage_source_enum", "p_confidence" numeric, "p_reason" "text", "p_changed_by" "text", "p_message_id" "uuid", "p_assessment_id" "uuid", "p_evidence_excerpt" "text", "p_evidence_json" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_funnel_transition_allowed"("p_from_stage" "public"."lead_stage_type", "p_to_stage" "public"."lead_stage_type") RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    AS $$
  SELECT CASE
    WHEN p_from_stage = p_to_stage THEN true
    WHEN p_from_stage = 'new' AND p_to_stage IN ('qualified', 'lost') THEN true
    WHEN p_from_stage = 'qualified' AND p_to_stage IN ('new', 'quote', 'lost') THEN true
    WHEN p_from_stage = 'quote' AND p_to_stage IN ('qualified', 'won', 'lost') THEN true
    WHEN p_from_stage = 'won' AND p_to_stage IN ('quote') THEN true
    WHEN p_from_stage = 'lost' AND p_to_stage IN ('new', 'qualified') THEN true
    ELSE false
  END;
$$;


ALTER FUNCTION "public"."is_funnel_transition_allowed"("p_from_stage" "public"."lead_stage_type", "p_to_stage" "public"."lead_stage_type") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mwl_normalize_search_text"("input_text" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $_$
  with tokens as (
    select
      regexp_split_to_table(lower(coalesce(trim(input_text), '')), '\s+') as token
  ),
  normalized as (
    select
      case
        when token ~ '^[a-z0-9]+itos$' then regexp_replace(token, 'itos$', 'ito')
        when token ~ '^[a-z0-9]+itas$' then regexp_replace(token, 'itas$', 'ita')
        when token ~ '^[a-z0-9]+es$' and length(token) > 4 then regexp_replace(token, 'es$', '')
        when token ~ '^[a-z0-9]+s$' and length(token) > 3 then regexp_replace(token, 's$', '')
        else token
      end as token
    from tokens
  )
  select trim(string_agg(token, ' '))
  from normalized;
$_$;


ALTER FUNCTION "public"."mwl_normalize_search_text"("input_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mwl_refresh_product_search_index"() RETURNS "void"
    LANGUAGE "sql"
    AS $$
  delete from public.mwl_product_search_index;

  insert into public.mwl_product_search_index (
    product_id,
    category,
    family,
    name,
    summary,
    details,
    aliases,
    search_boost,
    search_text,
    search_text_normalized,
    search_vector,
    updated_at
  )
  select
    v.id,
    coalesce(v.category, ''),
    coalesce(v.family, ''),
    v.name,
    v.summary,
    v.details,
    coalesce(v.aliases, array[]::text[]),
    coalesce(v.search_boost, 0),

    trim(
      concat_ws(
        ' ',
        v.name,
        v.category,
        v.family,
        v.summary,
        v.details,
        array_to_string(coalesce(v.aliases, array[]::text[]), ' ')
      )
    ) as search_text,

    public.mwl_normalize_search_text(
      trim(
        concat_ws(
          ' ',
          v.name,
          v.category,
          v.family,
          v.summary,
          v.details,
          array_to_string(coalesce(v.aliases, array[]::text[]), ' ')
        )
      )
    ) as search_text_normalized,

    setweight(to_tsvector('simple', coalesce(v.name, '')), 'A')
    ||
    setweight(to_tsvector('simple', coalesce(v.family, '')), 'A')
    ||
    setweight(to_tsvector('simple', coalesce(v.category, '')), 'B')
    ||
    setweight(to_tsvector('simple', coalesce(array_to_string(coalesce(v.aliases, array[]::text[]), ' '), '')), 'A')
    ||
    setweight(to_tsvector('simple', coalesce(v.summary, '')), 'B')
    ||
    setweight(to_tsvector('simple', coalesce(v.details, '')), 'C') as search_vector,

    now()
  from public.mwl_products_agent_view v;
$$;


ALTER FUNCTION "public"."mwl_refresh_product_search_index"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."order_items_apply_default_delivery_date"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.delivery_date IS NULL THEN
    SELECT o.delivery_date
    INTO NEW.delivery_date
    FROM public.orders o
    WHERE o.id = NEW.order_id;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."order_items_apply_default_delivery_date"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_mwl_products"("q" "text", "lim" integer DEFAULT 5) RETURNS TABLE("product_id" "text", "sku" "text", "name" "text", "category" "text", "family" "text", "variant_label" "text", "size_label" "text", "price_crc" integer, "price_from_crc" integer, "min_qty" integer, "summary" "text", "details" "text", "notes" "text", "aliases" "text"[], "source_ref" "text", "match_score" numeric)
    LANGUAGE "sql"
    AS $$
  with params as (
    select
      lower(trim(coalesce(q, ''))) as query_text,
      greatest(1, least(coalesce(lim, 5), 10)) as max_rows
  ),
  candidates as (
    select
      p.id as product_id,
      p.sku,
      p.name,
      p.category,
      p.family,
      p.variant_label,
      p.size_label,
      p.price_crc,
      p.price_from_crc,
      p.min_qty,
      p.summary,
      p.details,
      p.notes,
      p.aliases,
      p.source_ref,
      greatest(
        similarity(lower(p.name), (select query_text from params)),
        coalesce((
          select max(similarity(lower(a), (select query_text from params)))
          from unnest(p.aliases) as a
        ), 0)
      )::numeric as match_score
    from public.mwl_products_agent_view p
  )
  select
    c.product_id,
    c.sku,
    c.name,
    c.category,
    c.family,
    c.variant_label,
    c.size_label,
    c.price_crc,
    c.price_from_crc,
    c.min_qty,
    c.summary,
    c.details,
    c.notes,
    c.aliases,
    c.source_ref,
    c.match_score
  from candidates c
  where
    c.match_score >= 0.25
    or lower(c.name) like '%' || (select query_text from params) || '%'
    or exists (
      select 1
      from unnest(c.aliases) a
      where lower(a) like '%' || (select query_text from params) || '%'
    )
  order by c.match_score desc, c.name asc
  limit (select max_rows from params);
$$;


ALTER FUNCTION "public"."search_mwl_products"("q" "text", "lim" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_lead_stage_transition"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.lead_stage IS DISTINCT FROM OLD.lead_stage THEN
    IF NOT public.is_funnel_transition_allowed(OLD.lead_stage, NEW.lead_stage) THEN
      RAISE EXCEPTION 'Transicion no permitida de % a %', OLD.lead_stage, NEW.lead_stage;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_lead_stage_transition"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."alerts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lead_thread_id" "uuid",
    "alert_type" "text" NOT NULL,
    "channel" "text" NOT NULL,
    "priority" "public"."alert_priority_type" DEFAULT 'med'::"public"."alert_priority_type" NOT NULL,
    "recipient" "text" NOT NULL,
    "status" "public"."alert_status_type" DEFAULT 'sent'::"public"."alert_status_type" NOT NULL,
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."alerts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."banks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "code" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."banks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."campaign_attribution" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lead_thread_id" "uuid" NOT NULL,
    "source" "text" NOT NULL,
    "campaign_id" "text",
    "adset_id" "text",
    "creative_id" "text",
    "referral_payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "first_touch_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "campaign_uuid" "uuid"
);


ALTER TABLE "public"."campaign_attribution" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."campaign_spend" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid",
    "date" "date" NOT NULL,
    "amount_crc" numeric(12,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "impressions" integer,
    "clicks" integer,
    "cpc" numeric(10,2),
    "ctr" numeric(5,2)
);


ALTER TABLE "public"."campaign_spend" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."campaigns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "platform" "text",
    "objective" "text",
    "start_date" "date",
    "end_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "meta_campaign_id" "text",
    "status" "text" DEFAULT 'active'::"text",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."campaigns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lead_thread_id" "uuid" NOT NULL,
    "status_legacy" "text" NOT NULL,
    "payment_status" "text" DEFAULT 'pending_validation'::"text" NOT NULL,
    "currency" "text" DEFAULT 'CRC'::"text" NOT NULL,
    "subtotal_crc" integer DEFAULT 0 NOT NULL,
    "total_crc" integer DEFAULT 0 NOT NULL,
    "source" "text" DEFAULT 'nova'::"text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "contact_id" "uuid",
    "status" "public"."order_status_enum" DEFAULT 'draft'::"public"."order_status_enum" NOT NULL,
    "delivery_date" "date"
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."campaign_kpi" WITH ("security_invoker"='on') AS
 WITH "spend" AS (
         SELECT "campaign_spend"."campaign_id",
            "sum"("campaign_spend"."amount_crc") AS "total_spend"
           FROM "public"."campaign_spend"
          GROUP BY "campaign_spend"."campaign_id"
        ), "leads" AS (
         SELECT "campaign_attribution"."campaign_uuid" AS "campaign_id",
            "count"(DISTINCT "campaign_attribution"."lead_thread_id") AS "leads"
           FROM "public"."campaign_attribution"
          WHERE ("campaign_attribution"."campaign_uuid" IS NOT NULL)
          GROUP BY "campaign_attribution"."campaign_uuid"
        ), "orders_data" AS (
         SELECT "ca"."campaign_uuid" AS "campaign_id",
            "count"(DISTINCT "o_1"."id") AS "orders",
            "sum"("o_1"."total_crc") AS "revenue"
           FROM ("public"."campaign_attribution" "ca"
             JOIN "public"."orders" "o_1" ON (("o_1"."lead_thread_id" = "ca"."lead_thread_id")))
          WHERE ("ca"."campaign_uuid" IS NOT NULL)
          GROUP BY "ca"."campaign_uuid"
        )
 SELECT "c"."id",
    "c"."name",
    COALESCE("sp"."total_spend", (0)::numeric) AS "total_spend",
    COALESCE("l"."leads", (0)::bigint) AS "leads",
    COALESCE("o"."orders", (0)::bigint) AS "orders",
    COALESCE("o"."revenue", (0)::bigint) AS "revenue"
   FROM ((("public"."campaigns" "c"
     LEFT JOIN "spend" "sp" ON (("sp"."campaign_id" = "c"."id")))
     LEFT JOIN "leads" "l" ON (("l"."campaign_id" = "c"."id")))
     LEFT JOIN "orders_data" "o" ON (("o"."campaign_id" = "c"."id")));


ALTER VIEW "public"."campaign_kpi" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."campaign_kpi_extended" WITH ("security_invoker"='on') AS
 SELECT "c"."id",
    "c"."name",
    "k"."total_spend",
    "k"."leads",
    "k"."orders",
    "k"."revenue",
        CASE
            WHEN ("k"."total_spend" > (0)::numeric) THEN (("k"."revenue")::numeric / "k"."total_spend")
            ELSE (0)::numeric
        END AS "roas",
        CASE
            WHEN ("k"."leads" > 0) THEN (("k"."orders")::numeric / ("k"."leads")::numeric)
            ELSE (0)::numeric
        END AS "conversion_rate",
        CASE
            WHEN ("k"."orders" > 0) THEN ("k"."revenue" / "k"."orders")
            ELSE (0)::bigint
        END AS "avg_ticket"
   FROM ("public"."campaigns" "c"
     LEFT JOIN "public"."campaign_kpi" "k" ON (("k"."id" = "c"."id")));


ALTER VIEW "public"."campaign_kpi_extended" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lead_threads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lead_thread_key" "text" NOT NULL,
    "channel" "public"."channel_type" NOT NULL,
    "mode" "text" DEFAULT 'ai'::"text" NOT NULL,
    "owner" "text" DEFAULT 'karol'::"text" NOT NULL,
    "ai_lock_until" timestamp with time zone,
    "last_customer_ts" timestamp with time zone,
    "last_human_ts" timestamp with time zone,
    "last_ai_ts" timestamp with time zone,
    "lead_stage" "public"."lead_stage_type" DEFAULT 'new'::"public"."lead_stage_type" NOT NULL,
    "lead_score" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "contact_id" "uuid",
    "stage_confidence" numeric(4,3),
    "stage_source" "public"."funnel_stage_source_enum" DEFAULT 'system'::"public"."funnel_stage_source_enum" NOT NULL,
    "stage_locked" boolean DEFAULT false NOT NULL,
    "stage_lock_reason" "text",
    "last_agent_assessment_at" timestamp with time zone,
    "last_human_override_at" timestamp with time zone,
    "intent_level" "public"."qualification_level_enum",
    "requirement_clarity" "public"."clarity_level_enum",
    "quote_readiness" "public"."quote_readiness_enum",
    "abandonment_risk" "public"."risk_level_enum",
    "budget_status" "public"."budget_status_enum",
    "urgency_level" "public"."qualification_level_enum",
    "stage_reason" "text",
    "stage_evidence" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    CONSTRAINT "lead_threads_stage_confidence_chk" CHECK ((("stage_confidence" IS NULL) OR (("stage_confidence" >= (0)::numeric) AND ("stage_confidence" <= (1)::numeric))))
);


ALTER TABLE "public"."lead_threads" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."campaign_lead_quality" WITH ("security_invoker"='on') AS
 SELECT "ca"."campaign_uuid" AS "campaign_id",
    "count"(DISTINCT "lt"."id") AS "total_leads",
    "count"(DISTINCT
        CASE
            WHEN ("lt"."lead_stage" <> 'new'::"public"."lead_stage_type") THEN "lt"."id"
            ELSE NULL::"uuid"
        END) AS "progressed_leads",
    "count"(DISTINCT
        CASE
            WHEN ("lt"."lead_stage" = 'qualified'::"public"."lead_stage_type") THEN "lt"."id"
            ELSE NULL::"uuid"
        END) AS "qualified_leads",
    "count"(DISTINCT
        CASE
            WHEN ("lt"."lead_stage" = 'won'::"public"."lead_stage_type") THEN "lt"."id"
            ELSE NULL::"uuid"
        END) AS "won_leads"
   FROM ("public"."campaign_attribution" "ca"
     JOIN "public"."lead_threads" "lt" ON (("lt"."id" = "ca"."lead_thread_id")))
  GROUP BY "ca"."campaign_uuid";


ALTER VIEW "public"."campaign_lead_quality" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "primary_channel" "public"."channel_type" NOT NULL,
    "external_id" "text" NOT NULL,
    "display_name" "text",
    "tags" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "total_orders" integer DEFAULT 0,
    "total_spent_crc" numeric(12,2) DEFAULT 0,
    "last_order_at" timestamp with time zone,
    "customer_status" "text"
);


ALTER TABLE "public"."contacts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversation_objections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lead_thread_id" "uuid",
    "message_id" "uuid",
    "objection_type" "text" NOT NULL,
    "objection_subtype" "text",
    "detected_from" "text",
    "confidence" numeric(3,2),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "resolved_at" timestamp with time zone,
    "status" "public"."objection_status_enum" DEFAULT 'active'::"public"."objection_status_enum" NOT NULL,
    "severity" "public"."objection_severity_enum" DEFAULT 'medium'::"public"."objection_severity_enum" NOT NULL,
    "detected_by" "public"."funnel_stage_source_enum" DEFAULT 'agent'::"public"."funnel_stage_source_enum" NOT NULL,
    "evidence_excerpt" "text",
    "evidence_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "resolved_by" "text",
    "resolution_notes" "text",
    CONSTRAINT "conversation_objections_confidence_chk" CHECK ((("confidence" IS NULL) OR (("confidence" >= (0)::numeric) AND ("confidence" <= (1)::numeric))))
);


ALTER TABLE "public"."conversation_objections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversation_state" (
    "session_id" "text" NOT NULL,
    "ai_lock_until" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."conversation_state" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lead_thread_id" "uuid" NOT NULL,
    "sender_type" "public"."sender_type" NOT NULL,
    "text" "text",
    "attachments" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "provider" "public"."provider_type" NOT NULL,
    "external_message_id" "text",
    "cw_message_id" "text",
    "provider_ts" timestamp with time zone,
    "received_ts" timestamp with time zone DEFAULT "now"() NOT NULL,
    "hash_dedupe" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."conversation_summary" WITH ("security_invoker"='on') AS
 WITH "msg" AS (
         SELECT "messages"."lead_thread_id",
            "count"(*) AS "total_messages",
            "max"("messages"."created_at") AS "last_message_at"
           FROM "public"."messages"
          GROUP BY "messages"."lead_thread_id"
        ), "obj" AS (
         SELECT "conversation_objections"."lead_thread_id",
            "count"(*) AS "total_objections",
            "max"("conversation_objections"."created_at") AS "last_objection_at"
           FROM "public"."conversation_objections"
          GROUP BY "conversation_objections"."lead_thread_id"
        )
 SELECT "lt"."id" AS "lead_thread_id",
    "lt"."lead_stage",
    "msg"."last_message_at",
    COALESCE("msg"."total_messages", (0)::bigint) AS "total_messages",
    COALESCE("obj"."total_objections", (0)::bigint) AS "objections",
    GREATEST("lt"."updated_at", COALESCE("msg"."last_message_at", "lt"."updated_at"), COALESCE("obj"."last_objection_at", "lt"."updated_at")) AS "last_activity"
   FROM (("public"."lead_threads" "lt"
     LEFT JOIN "msg" ON (("msg"."lead_thread_id" = "lt"."id")))
     LEFT JOIN "obj" ON (("obj"."lead_thread_id" = "lt"."id")));


ALTER VIEW "public"."conversation_summary" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."customer_summary" AS
SELECT
    NULL::"uuid" AS "id",
    NULL::"text" AS "display_name",
    NULL::bigint AS "total_orders",
    NULL::bigint AS "total_spent",
    NULL::timestamp with time zone AS "last_order_at";


ALTER VIEW "public"."customer_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cw_mapping" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_key" "text" NOT NULL,
    "cw_inbox_id" "text",
    "cw_contact_id" "text",
    "cw_conversation_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."cw_mapping" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."followups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lead_thread_id" "uuid" NOT NULL,
    "due_at" timestamp with time zone NOT NULL,
    "status" "public"."followup_status_type" DEFAULT 'scheduled'::"public"."followup_status_type" NOT NULL,
    "attempt" integer DEFAULT 0 NOT NULL,
    "template_key" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."followups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."funnel_stage_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lead_thread_id" "uuid",
    "stage" "text" NOT NULL,
    "entered_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "exited_at" timestamp with time zone,
    "duration_seconds" integer,
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "from_stage" "public"."lead_stage_type",
    "to_stage" "public"."lead_stage_type",
    "source" "public"."funnel_stage_source_enum" DEFAULT 'system'::"public"."funnel_stage_source_enum" NOT NULL,
    "confidence" numeric(4,3),
    "changed_by" "text",
    "message_id" "uuid",
    "assessment_id" "uuid",
    "evidence_excerpt" "text",
    "evidence_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    CONSTRAINT "funnel_stage_history_confidence_chk" CHECK ((("confidence" IS NULL) OR (("confidence" >= (0)::numeric) AND ("confidence" <= (1)::numeric))))
);


ALTER TABLE "public"."funnel_stage_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lead_agent_assessments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lead_thread_id" "uuid" NOT NULL,
    "message_id" "uuid",
    "proposed_stage" "public"."lead_stage_type" NOT NULL,
    "confidence" numeric(4,3) NOT NULL,
    "lead_score" integer DEFAULT 0 NOT NULL,
    "intent_level" "public"."qualification_level_enum",
    "requirement_clarity" "public"."clarity_level_enum",
    "quote_readiness" "public"."quote_readiness_enum",
    "abandonment_risk" "public"."risk_level_enum",
    "budget_status" "public"."budget_status_enum",
    "urgency_level" "public"."qualification_level_enum",
    "should_advance" boolean DEFAULT false NOT NULL,
    "should_hold" boolean DEFAULT true NOT NULL,
    "should_fallback" boolean DEFAULT false NOT NULL,
    "rationale_text" "text",
    "evidence_excerpt" "text",
    "rationale_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "evidence_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "model_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "lead_agent_assessments_confidence_chk" CHECK ((("confidence" >= (0)::numeric) AND ("confidence" <= (1)::numeric))),
    CONSTRAINT "lead_agent_assessments_score_chk" CHECK ((("lead_score" >= 0) AND ("lead_score" <= 100)))
);


ALTER TABLE "public"."lead_agent_assessments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mwl_business_policies" (
    "key" "text" NOT NULL,
    "value_text" "text",
    "value_json" "jsonb",
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."mwl_business_policies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mwl_discount_rules" (
    "id" bigint NOT NULL,
    "product_id" "text" NOT NULL,
    "min_qty" integer NOT NULL,
    "discount_percent" numeric(5,2),
    "discount_amount_crc" integer,
    "rule_type" "text" DEFAULT 'only_if_customer_requests'::"text" NOT NULL,
    "notes" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    CONSTRAINT "mwl_discount_rule_type_check" CHECK (("rule_type" = ANY (ARRAY['only_if_customer_requests'::"text", 'internal_review'::"text", 'automatic'::"text", 'never_offer_proactively'::"text"]))),
    CONSTRAINT "mwl_discount_value_check" CHECK ((("discount_percent" IS NOT NULL) OR ("discount_amount_crc" IS NOT NULL)))
);


ALTER TABLE "public"."mwl_discount_rules" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."mwl_discount_rules_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."mwl_discount_rules_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."mwl_discount_rules_id_seq" OWNED BY "public"."mwl_discount_rules"."id";



CREATE TABLE IF NOT EXISTS "public"."mwl_product_aliases" (
    "id" bigint NOT NULL,
    "product_id" "text" NOT NULL,
    "alias" "text" NOT NULL
);


ALTER TABLE "public"."mwl_product_aliases" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."mwl_product_aliases_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."mwl_product_aliases_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."mwl_product_aliases_id_seq" OWNED BY "public"."mwl_product_aliases"."id";



CREATE TABLE IF NOT EXISTS "public"."mwl_product_images" (
    "id" bigint NOT NULL,
    "product_id" "text" NOT NULL,
    "storage_bucket" "text" DEFAULT 'mwl-products'::"text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "alt_text" "text",
    "is_primary" boolean DEFAULT false NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."mwl_product_images" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."mwl_product_images_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."mwl_product_images_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."mwl_product_images_id_seq" OWNED BY "public"."mwl_product_images"."id";



CREATE TABLE IF NOT EXISTS "public"."mwl_product_search_index" (
    "product_id" "text" NOT NULL,
    "category" "text" NOT NULL,
    "family" "text" NOT NULL,
    "name" "text" NOT NULL,
    "summary" "text",
    "details" "text",
    "aliases" "text"[] DEFAULT ARRAY[]::"text"[] NOT NULL,
    "search_boost" integer DEFAULT 0 NOT NULL,
    "search_text" "text" NOT NULL,
    "search_text_normalized" "text" NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "search_vector" "tsvector"
);


ALTER TABLE "public"."mwl_product_search_index" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mwl_product_search_terms" (
    "id" bigint NOT NULL,
    "product_id" "text",
    "family" "text",
    "category" "text",
    "term" "text" NOT NULL,
    "term_normalized" "text" GENERATED ALWAYS AS ("lower"(TRIM(BOTH FROM "term"))) STORED,
    "term_type" "text" DEFAULT 'alias'::"text" NOT NULL,
    "priority" integer DEFAULT 100 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "notes" "text",
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "mwl_product_search_terms_scope_chk" CHECK ((("product_id" IS NOT NULL) OR ("family" IS NOT NULL) OR ("category" IS NOT NULL)))
);


ALTER TABLE "public"."mwl_product_search_terms" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."mwl_product_search_terms_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."mwl_product_search_terms_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."mwl_product_search_terms_id_seq" OWNED BY "public"."mwl_product_search_terms"."id";



CREATE TABLE IF NOT EXISTS "public"."mwl_products" (
    "id" "text" NOT NULL,
    "sku" "text" NOT NULL,
    "family" "text" NOT NULL,
    "name" "text" NOT NULL,
    "category" "text" NOT NULL,
    "variant_label" "text",
    "size_label" "text",
    "width_cm" numeric(10,2),
    "height_cm" numeric(10,2),
    "depth_cm" numeric(10,2),
    "material" "text",
    "base_color" "text",
    "print_type" "text",
    "personalization_area" "text",
    "price_crc" integer,
    "price_from_crc" integer,
    "min_qty" integer,
    "allows_name" boolean DEFAULT false NOT NULL,
    "includes_design_adjustment_count" integer DEFAULT 0 NOT NULL,
    "extra_adjustment_has_cost" boolean DEFAULT false NOT NULL,
    "requires_design_approval" boolean DEFAULT true NOT NULL,
    "is_full_color" boolean DEFAULT false NOT NULL,
    "is_premium" boolean DEFAULT false NOT NULL,
    "is_discountable" boolean DEFAULT false NOT NULL,
    "discount_visibility" "text" DEFAULT 'only_if_customer_requests'::"text" NOT NULL,
    "pricing_mode" "text" DEFAULT 'fixed'::"text" NOT NULL,
    "summary" "text",
    "details" "text",
    "notes" "text",
    "source_type" "text" DEFAULT 'manual'::"text" NOT NULL,
    "source_ref" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "is_agent_visible" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "search_boost" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "mwl_products_discount_visibility_check" CHECK (("discount_visibility" = ANY (ARRAY['never'::"text", 'only_if_customer_requests'::"text", 'internal_only'::"text", 'always'::"text"]))),
    CONSTRAINT "mwl_products_price_check" CHECK ((("price_crc" IS NOT NULL) OR ("price_from_crc" IS NOT NULL))),
    CONSTRAINT "mwl_products_pricing_mode_check" CHECK (("pricing_mode" = ANY (ARRAY['fixed'::"text", 'from'::"text", 'variable'::"text"])))
);


ALTER TABLE "public"."mwl_products" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."mwl_products_agent_view" WITH ("security_invoker"='on') AS
 SELECT "id",
    "sku",
    "family",
    "name",
    "category",
    "variant_label",
    "size_label",
    "width_cm",
    "height_cm",
    "depth_cm",
    "material",
    "base_color",
    "print_type",
    "personalization_area",
    "price_crc",
    "price_from_crc",
    "min_qty",
    "allows_name",
    "includes_design_adjustment_count",
    "extra_adjustment_has_cost",
    "requires_design_approval",
    "is_full_color",
    "is_premium",
    "is_discountable",
    "discount_visibility",
    "pricing_mode",
    "summary",
    "details",
    "notes",
    "source_type",
    "source_ref",
    "updated_at",
    "search_boost",
    COALESCE(ARRAY( SELECT "x"."term"
           FROM ( SELECT "t"."term",
                    "max"("t"."priority") AS "max_priority"
                   FROM "public"."mwl_product_search_terms" "t"
                  WHERE (("t"."is_active" = true) AND (("t"."product_id" = "p"."id") OR (("t"."product_id" IS NULL) AND ("t"."family" = "p"."family")) OR (("t"."product_id" IS NULL) AND ("t"."family" IS NULL) AND ("t"."category" = "p"."category"))))
                  GROUP BY "t"."term") "x"
          ORDER BY "x"."max_priority" DESC, "x"."term"), ARRAY[]::"text"[]) AS "aliases"
   FROM "public"."mwl_products" "p"
  WHERE (("is_active" = true) AND ("is_agent_visible" = true));


ALTER VIEW "public"."mwl_products_agent_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mwl_products_old" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "category" "text",
    "price_crc" integer,
    "price_from_crc" integer,
    "min_qty" integer,
    "details" "text",
    "notes" "text",
    "keywords" "text"[],
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."mwl_products_old" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."mwl_products_with_primary_image" WITH ("security_invoker"='on') AS
 SELECT "p"."id",
    "p"."sku",
    "p"."family",
    "p"."name",
    "p"."category",
    "p"."variant_label",
    "p"."size_label",
    "p"."width_cm",
    "p"."height_cm",
    "p"."depth_cm",
    "p"."material",
    "p"."base_color",
    "p"."print_type",
    "p"."personalization_area",
    "p"."price_crc",
    "p"."price_from_crc",
    "p"."min_qty",
    "p"."allows_name",
    "p"."includes_design_adjustment_count",
    "p"."extra_adjustment_has_cost",
    "p"."requires_design_approval",
    "p"."is_full_color",
    "p"."is_premium",
    "p"."is_discountable",
    "p"."discount_visibility",
    "p"."pricing_mode",
    "p"."summary",
    "p"."details",
    "p"."notes",
    "p"."source_type",
    "p"."source_ref",
    "p"."is_active",
    "p"."is_agent_visible",
    "p"."sort_order",
    "p"."updated_at",
    "i"."storage_bucket" AS "primary_image_bucket",
    "i"."storage_path" AS "primary_image_path",
    "i"."alt_text" AS "primary_image_alt"
   FROM ("public"."mwl_products" "p"
     LEFT JOIN "public"."mwl_product_images" "i" ON ((("i"."product_id" = "p"."id") AND ("i"."is_primary" = true))));


ALTER VIEW "public"."mwl_products_with_primary_image" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mwl_search_feedback" (
    "id" bigint NOT NULL,
    "searched_text" "text" NOT NULL,
    "searched_text_normalized" "text",
    "top_result_product_id" "text",
    "top_result_family" "text",
    "top_result_category" "text",
    "match_quality" "text",
    "score" numeric,
    "was_helpful" boolean,
    "corrected_to_product_id" "text",
    "corrected_to_family" "text",
    "corrected_to_category" "text",
    "source_channel" "text",
    "notes" "text",
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "lookup_mode" "text",
    "result_count" integer
);


ALTER TABLE "public"."mwl_search_feedback" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."mwl_search_feedback_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."mwl_search_feedback_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."mwl_search_feedback_id_seq" OWNED BY "public"."mwl_search_feedback"."id";



CREATE TABLE IF NOT EXISTS "public"."mwl_search_synonyms" (
    "id" bigint NOT NULL,
    "term" "text" NOT NULL,
    "term_normalized" "text" GENERATED ALWAYS AS ("public"."mwl_normalize_search_text"("term")) STORED,
    "maps_to" "text" NOT NULL,
    "maps_to_type" "text" NOT NULL,
    "priority" integer DEFAULT 100 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "notes" "text",
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "mwl_search_synonyms_maps_to_type_check" CHECK (("maps_to_type" = ANY (ARRAY['category'::"text", 'family'::"text", 'term'::"text"])))
);


ALTER TABLE "public"."mwl_search_synonyms" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."mwl_search_synonyms_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."mwl_search_synonyms_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."mwl_search_synonyms_id_seq" OWNED BY "public"."mwl_search_synonyms"."id";



CREATE TABLE IF NOT EXISTS "public"."n8n_chat_histories" (
    "id" integer NOT NULL,
    "session_id" character varying(255) NOT NULL,
    "message" "jsonb" NOT NULL
);


ALTER TABLE "public"."n8n_chat_histories" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."n8n_chat_histories_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."n8n_chat_histories_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."n8n_chat_histories_id_seq" OWNED BY "public"."n8n_chat_histories"."id";



CREATE TABLE IF NOT EXISTS "public"."order_activity" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "content" "text",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "text",
    CONSTRAINT "order_activity_note_content_check" CHECK ((("type" <> 'note'::"text") OR (("content" IS NOT NULL) AND ("btrim"("content") <> ''::"text")))),
    CONSTRAINT "order_activity_type_check" CHECK (("type" = ANY (ARRAY['note'::"text", 'status_change'::"text", 'payment_validation'::"text", 'system_event'::"text"])))
);


ALTER TABLE "public"."order_activity" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" bigint NOT NULL,
    "order_id" "uuid" NOT NULL,
    "product_id" "text",
    "quantity" integer DEFAULT 1 NOT NULL,
    "unit_price_crc" integer,
    "total_price_crc" integer,
    "product_name_snapshot" "text",
    "sku_snapshot" "text",
    "theme" "text",
    "delivery_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "item_notes" "text"
);


ALTER TABLE "public"."order_items" OWNER TO "postgres";


COMMENT ON COLUMN "public"."order_items"."item_notes" IS 'Detalles especificos del item que no tienen campo estructurado propio; no usar para contexto global de la orden ni duplicar quantity, theme o unit_price_crc.';



CREATE OR REPLACE VIEW "public"."order_items_delivery_exceptions" WITH ("security_invoker"='on') AS
 SELECT "oi"."id",
    "oi"."order_id",
    "oi"."product_id",
    "oi"."product_name_snapshot",
    "oi"."delivery_date" AS "item_delivery_date",
    "o"."delivery_date" AS "order_delivery_date"
   FROM ("public"."order_items" "oi"
     JOIN "public"."orders" "o" ON (("o"."id" = "oi"."order_id")))
  WHERE (("oi"."delivery_date" IS NOT NULL) AND ("o"."delivery_date" IS NOT NULL) AND ("oi"."delivery_date" IS DISTINCT FROM "o"."delivery_date"));


ALTER VIEW "public"."order_items_delivery_exceptions" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."order_items_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."order_items_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."order_items_id_seq" OWNED BY "public"."order_items"."id";



CREATE TABLE IF NOT EXISTS "public"."payment_receipts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "message_id" "uuid",
    "receipt_key" "text" NOT NULL,
    "status" "public"."payment_receipt_status_enum" DEFAULT 'pending_validation'::"public"."payment_receipt_status_enum" NOT NULL,
    "bank" "text",
    "transfer_type" "text",
    "amount_text" "text",
    "currency" "text" DEFAULT 'CRC'::"text" NOT NULL,
    "reference" "text",
    "sender_name" "text",
    "recipient_name" "text",
    "destination_phone" "text",
    "receipt_date" "date",
    "receipt_time" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "raw_payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "amount_crc" integer,
    "source" "public"."payment_receipt_source_enum" DEFAULT 'automation'::"public"."payment_receipt_source_enum" NOT NULL,
    "internal_notes" "text",
    "validated_at" timestamp with time zone,
    "validated_by" "text",
    "deleted_at" timestamp with time zone,
    "deleted_by" "text",
    "bank_id" "uuid",
    CONSTRAINT "payment_receipts_amount_crc_nonnegative_check" CHECK ((("amount_crc" IS NULL) OR ("amount_crc" >= 0))),
    CONSTRAINT "payment_receipts_currency_not_blank_check" CHECK (("btrim"("currency") <> ''::"text")),
    CONSTRAINT "payment_receipts_soft_delete_fields_check" CHECK (((("status" = 'soft_deleted'::"public"."payment_receipt_status_enum") AND ("deleted_at" IS NOT NULL)) OR (("status" <> 'soft_deleted'::"public"."payment_receipt_status_enum") AND ("deleted_at" IS NULL)))),
    CONSTRAINT "payment_receipts_validated_fields_check" CHECK ((("status" <> 'validated'::"public"."payment_receipt_status_enum") OR (("validated_at" IS NOT NULL) AND ("amount_crc" IS NOT NULL))))
);


ALTER TABLE "public"."payment_receipts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."processed_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider" "public"."provider_type" NOT NULL,
    "external_event_id" "text",
    "external_message_id" "text",
    "cw_message_id" "text",
    "processed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."processed_events" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."sales_kpi_daily" WITH ("security_invoker"='on') AS
 SELECT "date"("created_at") AS "day",
    "count"(*) AS "total_orders",
    COALESCE("sum"("total_crc"), (0)::bigint) AS "revenue"
   FROM "public"."orders"
  WHERE ("status" = ANY (ARRAY['confirmed'::"public"."order_status_enum", 'completed'::"public"."order_status_enum"]))
  GROUP BY ("date"("created_at"));


ALTER VIEW "public"."sales_kpi_daily" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."state_changes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lead_thread_id" "uuid" NOT NULL,
    "from_state" "text",
    "to_state" "text" NOT NULL,
    "reason" "text",
    "event_ref" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."state_changes" OWNER TO "postgres";


ALTER TABLE ONLY "public"."mwl_discount_rules" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."mwl_discount_rules_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."mwl_product_aliases" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."mwl_product_aliases_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."mwl_product_images" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."mwl_product_images_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."mwl_product_search_terms" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."mwl_product_search_terms_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."mwl_search_feedback" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."mwl_search_feedback_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."mwl_search_synonyms" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."mwl_search_synonyms_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."n8n_chat_histories" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."n8n_chat_histories_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."order_items" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."order_items_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."alerts"
    ADD CONSTRAINT "alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."banks"
    ADD CONSTRAINT "banks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."campaign_attribution"
    ADD CONSTRAINT "campaign_attribution_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."campaign_spend"
    ADD CONSTRAINT "campaign_spend_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_channel_external_unique" UNIQUE ("primary_channel", "external_id");



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversation_objections"
    ADD CONSTRAINT "conversation_objections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversation_state"
    ADD CONSTRAINT "conversation_state_pkey" PRIMARY KEY ("session_id");



ALTER TABLE ONLY "public"."cw_mapping"
    ADD CONSTRAINT "cw_mapping_conversation_key_key" UNIQUE ("conversation_key");



ALTER TABLE ONLY "public"."cw_mapping"
    ADD CONSTRAINT "cw_mapping_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."followups"
    ADD CONSTRAINT "followups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."funnel_stage_history"
    ADD CONSTRAINT "funnel_stage_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lead_agent_assessments"
    ADD CONSTRAINT "lead_agent_assessments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lead_threads"
    ADD CONSTRAINT "lead_threads_lead_thread_key_key" UNIQUE ("lead_thread_key");



ALTER TABLE ONLY "public"."lead_threads"
    ADD CONSTRAINT "lead_threads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mwl_business_policies"
    ADD CONSTRAINT "mwl_business_policies_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."mwl_discount_rules"
    ADD CONSTRAINT "mwl_discount_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mwl_discount_rules"
    ADD CONSTRAINT "mwl_discount_rules_unique" UNIQUE ("product_id", "min_qty", "rule_type");



ALTER TABLE ONLY "public"."mwl_product_aliases"
    ADD CONSTRAINT "mwl_product_aliases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mwl_product_aliases"
    ADD CONSTRAINT "mwl_product_aliases_unique" UNIQUE ("product_id", "alias");



ALTER TABLE ONLY "public"."mwl_product_images"
    ADD CONSTRAINT "mwl_product_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mwl_product_search_index"
    ADD CONSTRAINT "mwl_product_search_index_pkey" PRIMARY KEY ("product_id");



ALTER TABLE ONLY "public"."mwl_product_search_terms"
    ADD CONSTRAINT "mwl_product_search_terms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mwl_products_old"
    ADD CONSTRAINT "mwl_products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mwl_products"
    ADD CONSTRAINT "mwl_products_pkey1" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mwl_products"
    ADD CONSTRAINT "mwl_products_sku_key" UNIQUE ("sku");



ALTER TABLE ONLY "public"."mwl_search_feedback"
    ADD CONSTRAINT "mwl_search_feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mwl_search_synonyms"
    ADD CONSTRAINT "mwl_search_synonyms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."n8n_chat_histories"
    ADD CONSTRAINT "n8n_chat_histories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_activity"
    ADD CONSTRAINT "order_activity_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_receipts"
    ADD CONSTRAINT "payment_receipts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_receipts"
    ADD CONSTRAINT "payment_receipts_receipt_key_unique" UNIQUE ("receipt_key");



ALTER TABLE ONLY "public"."processed_events"
    ADD CONSTRAINT "processed_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."state_changes"
    ADD CONSTRAINT "state_changes_pkey" PRIMARY KEY ("id");



CREATE INDEX "alerts_conversation_idx" ON "public"."alerts" USING "btree" ("lead_thread_id", "created_at" DESC);



CREATE INDEX "alerts_status_idx" ON "public"."alerts" USING "btree" ("status", "created_at" DESC);



CREATE UNIQUE INDEX "banks_code_unique_idx" ON "public"."banks" USING "btree" ("lower"("code")) WHERE ("code" IS NOT NULL);



CREATE INDEX "banks_is_active_idx" ON "public"."banks" USING "btree" ("is_active");



CREATE UNIQUE INDEX "banks_name_unique_idx" ON "public"."banks" USING "btree" ("lower"("name"));



CREATE INDEX "campaign_attr_conversation_idx" ON "public"."campaign_attribution" USING "btree" ("lead_thread_id", "first_touch_at" DESC);



CREATE INDEX "campaign_attr_source_idx" ON "public"."campaign_attribution" USING "btree" ("source", "first_touch_at" DESC);



CREATE INDEX "contacts_external_id_idx" ON "public"."contacts" USING "btree" ("external_id");



CREATE INDEX "cw_mapping_cw_contact_idx" ON "public"."cw_mapping" USING "btree" ("cw_contact_id") WHERE ("cw_contact_id" IS NOT NULL);



CREATE INDEX "cw_mapping_cw_conversation_idx" ON "public"."cw_mapping" USING "btree" ("cw_conversation_id") WHERE ("cw_conversation_id" IS NOT NULL);



CREATE INDEX "followups_conversation_idx" ON "public"."followups" USING "btree" ("lead_thread_id", "due_at" DESC);



CREATE INDEX "followups_due_idx" ON "public"."followups" USING "btree" ("status", "due_at");



CREATE INDEX "idx_conversation_objections_severity" ON "public"."conversation_objections" USING "btree" ("severity", "status");



CREATE INDEX "idx_conversation_objections_thread_status" ON "public"."conversation_objections" USING "btree" ("lead_thread_id", "status", "created_at" DESC);



CREATE INDEX "idx_conversation_objections_type" ON "public"."conversation_objections" USING "btree" ("objection_type", "objection_subtype");



CREATE INDEX "idx_funnel_stage_history_assessment" ON "public"."funnel_stage_history" USING "btree" ("assessment_id");



CREATE INDEX "idx_funnel_stage_history_thread_entered" ON "public"."funnel_stage_history" USING "btree" ("lead_thread_id", "entered_at" DESC);



CREATE INDEX "idx_funnel_stage_history_to_stage" ON "public"."funnel_stage_history" USING "btree" ("to_stage", "entered_at" DESC);



CREATE INDEX "idx_lead_agent_assessments_message" ON "public"."lead_agent_assessments" USING "btree" ("message_id");



CREATE INDEX "idx_lead_agent_assessments_stage" ON "public"."lead_agent_assessments" USING "btree" ("proposed_stage", "created_at" DESC);



CREATE INDEX "idx_lead_agent_assessments_thread_created" ON "public"."lead_agent_assessments" USING "btree" ("lead_thread_id", "created_at" DESC);



CREATE INDEX "idx_lead_threads_abandonment_risk" ON "public"."lead_threads" USING "btree" ("abandonment_risk");



CREATE INDEX "idx_lead_threads_quote_readiness" ON "public"."lead_threads" USING "btree" ("quote_readiness");



CREATE INDEX "idx_lead_threads_stage_locked" ON "public"."lead_threads" USING "btree" ("stage_locked");



CREATE INDEX "idx_lead_threads_stage_source" ON "public"."lead_threads" USING "btree" ("stage_source");



CREATE INDEX "idx_mwl_discount_rules_product" ON "public"."mwl_discount_rules" USING "btree" ("product_id", "is_active");



CREATE INDEX "idx_mwl_product_aliases_alias_trgm" ON "public"."mwl_product_aliases" USING "gin" ("alias" "public"."gin_trgm_ops");



CREATE INDEX "idx_mwl_product_aliases_product" ON "public"."mwl_product_aliases" USING "btree" ("product_id");



CREATE UNIQUE INDEX "idx_mwl_product_images_path_unique" ON "public"."mwl_product_images" USING "btree" ("storage_bucket", "storage_path");



CREATE UNIQUE INDEX "idx_mwl_product_images_primary_unique" ON "public"."mwl_product_images" USING "btree" ("product_id") WHERE ("is_primary" = true);



CREATE INDEX "idx_mwl_product_images_product" ON "public"."mwl_product_images" USING "btree" ("product_id", "sort_order");



CREATE INDEX "idx_mwl_product_search_index_text_trgm" ON "public"."mwl_product_search_index" USING "gin" ("search_text_normalized" "public"."gin_trgm_ops");



CREATE INDEX "idx_mwl_product_search_index_vector" ON "public"."mwl_product_search_index" USING "gin" ("search_vector");



CREATE INDEX "idx_mwl_products_agent_visible" ON "public"."mwl_products" USING "btree" ("is_agent_visible", "is_active");



CREATE INDEX "idx_mwl_products_category" ON "public"."mwl_products" USING "btree" ("category");



CREATE INDEX "idx_mwl_products_family" ON "public"."mwl_products" USING "btree" ("family");



CREATE INDEX "idx_mwl_products_name_trgm" ON "public"."mwl_products" USING "gin" ("name" "public"."gin_trgm_ops");



CREATE INDEX "idx_mwl_search_synonyms_term_norm" ON "public"."mwl_search_synonyms" USING "btree" ("term_normalized");



CREATE INDEX "idx_mwl_search_synonyms_type_map" ON "public"."mwl_search_synonyms" USING "btree" ("maps_to_type", "maps_to");



CREATE INDEX "idx_mwl_search_terms_category" ON "public"."mwl_product_search_terms" USING "btree" ("category");



CREATE INDEX "idx_mwl_search_terms_family" ON "public"."mwl_product_search_terms" USING "btree" ("family");



CREATE INDEX "idx_mwl_search_terms_product" ON "public"."mwl_product_search_terms" USING "btree" ("product_id");



CREATE INDEX "idx_mwl_search_terms_term" ON "public"."mwl_product_search_terms" USING "btree" ("term_normalized");



CREATE INDEX "idx_order_activity_order_id_created_at" ON "public"."order_activity" USING "btree" ("order_id", "created_at" DESC);



CREATE INDEX "idx_order_items_order_id" ON "public"."order_items" USING "btree" ("order_id");



CREATE INDEX "idx_orders_contact_id" ON "public"."orders" USING "btree" ("contact_id");



CREATE INDEX "idx_orders_conversation_id" ON "public"."orders" USING "btree" ("lead_thread_id");



CREATE INDEX "idx_orders_status" ON "public"."orders" USING "btree" ("status", "payment_status");



CREATE INDEX "idx_payment_receipts_bank_id" ON "public"."payment_receipts" USING "btree" ("bank_id");



CREATE INDEX "idx_payment_receipts_message_id" ON "public"."payment_receipts" USING "btree" ("message_id");



CREATE INDEX "idx_payment_receipts_order_id" ON "public"."payment_receipts" USING "btree" ("order_id");



CREATE INDEX "idx_payment_receipts_order_pending_active" ON "public"."payment_receipts" USING "btree" ("order_id", "created_at" DESC) WHERE (("status" = 'pending_validation'::"public"."payment_receipt_status_enum") AND ("deleted_at" IS NULL));



CREATE INDEX "idx_payment_receipts_order_status_active" ON "public"."payment_receipts" USING "btree" ("order_id", "status") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_payment_receipts_order_validated_active" ON "public"."payment_receipts" USING "btree" ("order_id", "validated_at" DESC) WHERE (("status" = 'validated'::"public"."payment_receipt_status_enum") AND ("deleted_at" IS NULL));



CREATE INDEX "idx_payment_receipts_reference_active" ON "public"."payment_receipts" USING "btree" ("reference") WHERE (("reference" IS NOT NULL) AND ("deleted_at" IS NULL));



CREATE INDEX "idx_products_keywords" ON "public"."mwl_products_old" USING "gin" ("keywords");



CREATE INDEX "idx_products_name_trgm" ON "public"."mwl_products_old" USING "gin" ("name" "public"."gin_trgm_ops");



CREATE INDEX "lead_threads_channel_idx" ON "public"."lead_threads" USING "btree" ("channel");



CREATE INDEX "lead_threads_contact_idx" ON "public"."lead_threads" USING "btree" ("contact_id");



CREATE INDEX "lead_threads_lead_stage_idx" ON "public"."lead_threads" USING "btree" ("lead_stage");



CREATE INDEX "lead_threads_updated_at_idx" ON "public"."lead_threads" USING "btree" ("updated_at" DESC);



CREATE INDEX "messages_conversation_id_ts_idx" ON "public"."messages" USING "btree" ("lead_thread_id", "created_at" DESC);



CREATE UNIQUE INDEX "messages_cw_message_unique" ON "public"."messages" USING "btree" ("cw_message_id") WHERE ("cw_message_id" IS NOT NULL);



CREATE INDEX "messages_hash_dedupe_idx" ON "public"."messages" USING "btree" ("hash_dedupe") WHERE ("hash_dedupe" IS NOT NULL);



CREATE UNIQUE INDEX "messages_provider_external_msg_unique" ON "public"."messages" USING "btree" ("provider", "external_message_id") WHERE ("external_message_id" IS NOT NULL);



CREATE INDEX "messages_provider_ts_idx" ON "public"."messages" USING "btree" ("provider", "provider_ts" DESC);



CREATE UNIQUE INDEX "processed_events_provider_cw_msg_unique" ON "public"."processed_events" USING "btree" ("provider", "cw_message_id") WHERE ("cw_message_id" IS NOT NULL);



CREATE UNIQUE INDEX "processed_events_provider_external_event_unique" ON "public"."processed_events" USING "btree" ("provider", "external_event_id") WHERE ("external_event_id" IS NOT NULL);



CREATE UNIQUE INDEX "processed_events_provider_external_msg_unique" ON "public"."processed_events" USING "btree" ("provider", "external_message_id") WHERE ("external_message_id" IS NOT NULL);



CREATE INDEX "state_changes_conversation_idx" ON "public"."state_changes" USING "btree" ("lead_thread_id", "created_at" DESC);



CREATE UNIQUE INDEX "uq_order_items_order_product" ON "public"."order_items" USING "btree" ("order_id", "product_id") WHERE ("product_id" IS NOT NULL);



CREATE UNIQUE INDEX "uq_orders_one_draft_per_thread" ON "public"."orders" USING "btree" ("lead_thread_id") WHERE ("status" = 'draft'::"public"."order_status_enum");



CREATE OR REPLACE VIEW "public"."customer_summary" WITH ("security_invoker"='on') AS
 SELECT "c"."id",
    "c"."display_name",
    "count"("o"."id") AS "total_orders",
    COALESCE("sum"("o"."total_crc"), (0)::bigint) AS "total_spent",
    "max"("o"."created_at") AS "last_order_at"
   FROM ("public"."contacts" "c"
     LEFT JOIN "public"."orders" "o" ON (("o"."contact_id" = "c"."id")))
  GROUP BY "c"."id";



CREATE OR REPLACE TRIGGER "trg_contacts_updated_at" BEFORE UPDATE ON "public"."contacts" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_conversations_updated_at" BEFORE UPDATE ON "public"."lead_threads" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_cw_mapping_updated_at" BEFORE UPDATE ON "public"."cw_mapping" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_followups_updated_at" BEFORE UPDATE ON "public"."followups" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_order_items_apply_default_delivery_date" BEFORE INSERT OR UPDATE OF "order_id", "delivery_date" ON "public"."order_items" FOR EACH ROW WHEN (("new"."delivery_date" IS NULL)) EXECUTE FUNCTION "public"."order_items_apply_default_delivery_date"();



CREATE OR REPLACE TRIGGER "trg_orders_updated_at" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_payment_receipts_updated_at" BEFORE UPDATE ON "public"."payment_receipts" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_validate_lead_stage_transition" BEFORE UPDATE ON "public"."lead_threads" FOR EACH ROW EXECUTE FUNCTION "public"."validate_lead_stage_transition"();



ALTER TABLE ONLY "public"."alerts"
    ADD CONSTRAINT "alerts_lead_thread_id_fkey" FOREIGN KEY ("lead_thread_id") REFERENCES "public"."lead_threads"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."campaign_attribution"
    ADD CONSTRAINT "campaign_attribution_lead_thread_id_fkey" FOREIGN KEY ("lead_thread_id") REFERENCES "public"."lead_threads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."campaign_spend"
    ADD CONSTRAINT "campaign_spend_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_objections"
    ADD CONSTRAINT "conversation_objections_lead_thread_id_fkey" FOREIGN KEY ("lead_thread_id") REFERENCES "public"."lead_threads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_objections"
    ADD CONSTRAINT "conversation_objections_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id");



ALTER TABLE ONLY "public"."lead_threads"
    ADD CONSTRAINT "conversations_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."campaign_attribution"
    ADD CONSTRAINT "fk_campaign_uuid" FOREIGN KEY ("campaign_uuid") REFERENCES "public"."campaigns"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."followups"
    ADD CONSTRAINT "followups_lead_thread_id_fkey" FOREIGN KEY ("lead_thread_id") REFERENCES "public"."lead_threads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."funnel_stage_history"
    ADD CONSTRAINT "funnel_stage_history_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "public"."lead_agent_assessments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."funnel_stage_history"
    ADD CONSTRAINT "funnel_stage_history_lead_thread_id_fkey" FOREIGN KEY ("lead_thread_id") REFERENCES "public"."lead_threads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."funnel_stage_history"
    ADD CONSTRAINT "funnel_stage_history_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."lead_agent_assessments"
    ADD CONSTRAINT "lead_agent_assessments_lead_thread_id_fkey" FOREIGN KEY ("lead_thread_id") REFERENCES "public"."lead_threads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lead_agent_assessments"
    ADD CONSTRAINT "lead_agent_assessments_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_lead_thread_id_fkey" FOREIGN KEY ("lead_thread_id") REFERENCES "public"."lead_threads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mwl_discount_rules"
    ADD CONSTRAINT "mwl_discount_rules_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."mwl_products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mwl_product_aliases"
    ADD CONSTRAINT "mwl_product_aliases_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."mwl_products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mwl_product_images"
    ADD CONSTRAINT "mwl_product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."mwl_products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mwl_product_search_index"
    ADD CONSTRAINT "mwl_product_search_index_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."mwl_products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mwl_product_search_terms"
    ADD CONSTRAINT "mwl_product_search_terms_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."mwl_products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_activity"
    ADD CONSTRAINT "order_activity_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."mwl_products"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_lead_thread_id_fkey" FOREIGN KEY ("lead_thread_id") REFERENCES "public"."lead_threads"("id");



ALTER TABLE ONLY "public"."payment_receipts"
    ADD CONSTRAINT "payment_receipts_bank_id_fkey" FOREIGN KEY ("bank_id") REFERENCES "public"."banks"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payment_receipts"
    ADD CONSTRAINT "payment_receipts_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payment_receipts"
    ADD CONSTRAINT "payment_receipts_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."state_changes"
    ADD CONSTRAINT "state_changes_lead_thread_id_fkey" FOREIGN KEY ("lead_thread_id") REFERENCES "public"."lead_threads"("id") ON DELETE CASCADE;



ALTER TABLE "public"."alerts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."banks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."campaign_attribution" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."campaign_spend" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."campaigns" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contacts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversation_objections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversation_state" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cw_mapping" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."followups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."funnel_stage_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lead_agent_assessments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lead_threads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mwl_business_policies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mwl_discount_rules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mwl_product_aliases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mwl_product_images" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mwl_product_search_index" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mwl_product_search_terms" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mwl_products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mwl_products_old" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mwl_search_feedback" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mwl_search_synonyms" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."n8n_chat_histories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_activity" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_receipts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."processed_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."state_changes" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."apply_funnel_stage_transition"("p_lead_thread_id" "uuid", "p_to_stage" "public"."lead_stage_type", "p_source" "public"."funnel_stage_source_enum", "p_confidence" numeric, "p_reason" "text", "p_changed_by" "text", "p_message_id" "uuid", "p_assessment_id" "uuid", "p_evidence_excerpt" "text", "p_evidence_json" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."apply_funnel_stage_transition"("p_lead_thread_id" "uuid", "p_to_stage" "public"."lead_stage_type", "p_source" "public"."funnel_stage_source_enum", "p_confidence" numeric, "p_reason" "text", "p_changed_by" "text", "p_message_id" "uuid", "p_assessment_id" "uuid", "p_evidence_excerpt" "text", "p_evidence_json" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_funnel_stage_transition"("p_lead_thread_id" "uuid", "p_to_stage" "public"."lead_stage_type", "p_source" "public"."funnel_stage_source_enum", "p_confidence" numeric, "p_reason" "text", "p_changed_by" "text", "p_message_id" "uuid", "p_assessment_id" "uuid", "p_evidence_excerpt" "text", "p_evidence_json" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_funnel_transition_allowed"("p_from_stage" "public"."lead_stage_type", "p_to_stage" "public"."lead_stage_type") TO "anon";
GRANT ALL ON FUNCTION "public"."is_funnel_transition_allowed"("p_from_stage" "public"."lead_stage_type", "p_to_stage" "public"."lead_stage_type") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_funnel_transition_allowed"("p_from_stage" "public"."lead_stage_type", "p_to_stage" "public"."lead_stage_type") TO "service_role";



GRANT ALL ON FUNCTION "public"."mwl_normalize_search_text"("input_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."mwl_normalize_search_text"("input_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mwl_normalize_search_text"("input_text" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."mwl_refresh_product_search_index"() TO "anon";
GRANT ALL ON FUNCTION "public"."mwl_refresh_product_search_index"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."mwl_refresh_product_search_index"() TO "service_role";



GRANT ALL ON FUNCTION "public"."order_items_apply_default_delivery_date"() TO "anon";
GRANT ALL ON FUNCTION "public"."order_items_apply_default_delivery_date"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."order_items_apply_default_delivery_date"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."search_mwl_products"("q" "text", "lim" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_mwl_products"("q" "text", "lim" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_mwl_products"("q" "text", "lim" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "postgres";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "anon";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."show_limit"() TO "postgres";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_lead_stage_transition"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_lead_stage_transition"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_lead_stage_transition"() TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "service_role";


















GRANT ALL ON TABLE "public"."alerts" TO "anon";
GRANT ALL ON TABLE "public"."alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."alerts" TO "service_role";



GRANT ALL ON TABLE "public"."banks" TO "anon";
GRANT ALL ON TABLE "public"."banks" TO "authenticated";
GRANT ALL ON TABLE "public"."banks" TO "service_role";



GRANT ALL ON TABLE "public"."campaign_attribution" TO "anon";
GRANT ALL ON TABLE "public"."campaign_attribution" TO "authenticated";
GRANT ALL ON TABLE "public"."campaign_attribution" TO "service_role";



GRANT ALL ON TABLE "public"."campaign_spend" TO "anon";
GRANT ALL ON TABLE "public"."campaign_spend" TO "authenticated";
GRANT ALL ON TABLE "public"."campaign_spend" TO "service_role";



GRANT ALL ON TABLE "public"."campaigns" TO "anon";
GRANT ALL ON TABLE "public"."campaigns" TO "authenticated";
GRANT ALL ON TABLE "public"."campaigns" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."campaign_kpi" TO "anon";
GRANT ALL ON TABLE "public"."campaign_kpi" TO "authenticated";
GRANT ALL ON TABLE "public"."campaign_kpi" TO "service_role";



GRANT ALL ON TABLE "public"."campaign_kpi_extended" TO "anon";
GRANT ALL ON TABLE "public"."campaign_kpi_extended" TO "authenticated";
GRANT ALL ON TABLE "public"."campaign_kpi_extended" TO "service_role";



GRANT ALL ON TABLE "public"."lead_threads" TO "anon";
GRANT ALL ON TABLE "public"."lead_threads" TO "authenticated";
GRANT ALL ON TABLE "public"."lead_threads" TO "service_role";



GRANT ALL ON TABLE "public"."campaign_lead_quality" TO "anon";
GRANT ALL ON TABLE "public"."campaign_lead_quality" TO "authenticated";
GRANT ALL ON TABLE "public"."campaign_lead_quality" TO "service_role";



GRANT ALL ON TABLE "public"."contacts" TO "anon";
GRANT ALL ON TABLE "public"."contacts" TO "authenticated";
GRANT ALL ON TABLE "public"."contacts" TO "service_role";



GRANT ALL ON TABLE "public"."conversation_objections" TO "anon";
GRANT ALL ON TABLE "public"."conversation_objections" TO "authenticated";
GRANT ALL ON TABLE "public"."conversation_objections" TO "service_role";



GRANT ALL ON TABLE "public"."conversation_state" TO "anon";
GRANT ALL ON TABLE "public"."conversation_state" TO "authenticated";
GRANT ALL ON TABLE "public"."conversation_state" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."conversation_summary" TO "anon";
GRANT ALL ON TABLE "public"."conversation_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."conversation_summary" TO "service_role";



GRANT ALL ON TABLE "public"."customer_summary" TO "anon";
GRANT ALL ON TABLE "public"."customer_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_summary" TO "service_role";



GRANT ALL ON TABLE "public"."cw_mapping" TO "anon";
GRANT ALL ON TABLE "public"."cw_mapping" TO "authenticated";
GRANT ALL ON TABLE "public"."cw_mapping" TO "service_role";



GRANT ALL ON TABLE "public"."followups" TO "anon";
GRANT ALL ON TABLE "public"."followups" TO "authenticated";
GRANT ALL ON TABLE "public"."followups" TO "service_role";



GRANT ALL ON TABLE "public"."funnel_stage_history" TO "anon";
GRANT ALL ON TABLE "public"."funnel_stage_history" TO "authenticated";
GRANT ALL ON TABLE "public"."funnel_stage_history" TO "service_role";



GRANT ALL ON TABLE "public"."lead_agent_assessments" TO "anon";
GRANT ALL ON TABLE "public"."lead_agent_assessments" TO "authenticated";
GRANT ALL ON TABLE "public"."lead_agent_assessments" TO "service_role";



GRANT ALL ON TABLE "public"."mwl_business_policies" TO "anon";
GRANT ALL ON TABLE "public"."mwl_business_policies" TO "authenticated";
GRANT ALL ON TABLE "public"."mwl_business_policies" TO "service_role";



GRANT ALL ON TABLE "public"."mwl_discount_rules" TO "anon";
GRANT ALL ON TABLE "public"."mwl_discount_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."mwl_discount_rules" TO "service_role";



GRANT ALL ON SEQUENCE "public"."mwl_discount_rules_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."mwl_discount_rules_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."mwl_discount_rules_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."mwl_product_aliases" TO "anon";
GRANT ALL ON TABLE "public"."mwl_product_aliases" TO "authenticated";
GRANT ALL ON TABLE "public"."mwl_product_aliases" TO "service_role";



GRANT ALL ON SEQUENCE "public"."mwl_product_aliases_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."mwl_product_aliases_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."mwl_product_aliases_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."mwl_product_images" TO "anon";
GRANT ALL ON TABLE "public"."mwl_product_images" TO "authenticated";
GRANT ALL ON TABLE "public"."mwl_product_images" TO "service_role";



GRANT ALL ON SEQUENCE "public"."mwl_product_images_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."mwl_product_images_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."mwl_product_images_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."mwl_product_search_index" TO "anon";
GRANT ALL ON TABLE "public"."mwl_product_search_index" TO "authenticated";
GRANT ALL ON TABLE "public"."mwl_product_search_index" TO "service_role";



GRANT ALL ON TABLE "public"."mwl_product_search_terms" TO "anon";
GRANT ALL ON TABLE "public"."mwl_product_search_terms" TO "authenticated";
GRANT ALL ON TABLE "public"."mwl_product_search_terms" TO "service_role";



GRANT ALL ON SEQUENCE "public"."mwl_product_search_terms_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."mwl_product_search_terms_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."mwl_product_search_terms_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."mwl_products" TO "anon";
GRANT ALL ON TABLE "public"."mwl_products" TO "authenticated";
GRANT ALL ON TABLE "public"."mwl_products" TO "service_role";



GRANT ALL ON TABLE "public"."mwl_products_agent_view" TO "anon";
GRANT ALL ON TABLE "public"."mwl_products_agent_view" TO "authenticated";
GRANT ALL ON TABLE "public"."mwl_products_agent_view" TO "service_role";



GRANT ALL ON TABLE "public"."mwl_products_old" TO "anon";
GRANT ALL ON TABLE "public"."mwl_products_old" TO "authenticated";
GRANT ALL ON TABLE "public"."mwl_products_old" TO "service_role";



GRANT ALL ON TABLE "public"."mwl_products_with_primary_image" TO "anon";
GRANT ALL ON TABLE "public"."mwl_products_with_primary_image" TO "authenticated";
GRANT ALL ON TABLE "public"."mwl_products_with_primary_image" TO "service_role";



GRANT ALL ON TABLE "public"."mwl_search_feedback" TO "anon";
GRANT ALL ON TABLE "public"."mwl_search_feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."mwl_search_feedback" TO "service_role";



GRANT ALL ON SEQUENCE "public"."mwl_search_feedback_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."mwl_search_feedback_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."mwl_search_feedback_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."mwl_search_synonyms" TO "anon";
GRANT ALL ON TABLE "public"."mwl_search_synonyms" TO "authenticated";
GRANT ALL ON TABLE "public"."mwl_search_synonyms" TO "service_role";



GRANT ALL ON SEQUENCE "public"."mwl_search_synonyms_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."mwl_search_synonyms_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."mwl_search_synonyms_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."n8n_chat_histories" TO "anon";
GRANT ALL ON TABLE "public"."n8n_chat_histories" TO "authenticated";
GRANT ALL ON TABLE "public"."n8n_chat_histories" TO "service_role";



GRANT ALL ON SEQUENCE "public"."n8n_chat_histories_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."n8n_chat_histories_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."n8n_chat_histories_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."order_activity" TO "anon";
GRANT ALL ON TABLE "public"."order_activity" TO "authenticated";
GRANT ALL ON TABLE "public"."order_activity" TO "service_role";



GRANT ALL ON TABLE "public"."order_items" TO "anon";
GRANT ALL ON TABLE "public"."order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items" TO "service_role";



GRANT ALL ON TABLE "public"."order_items_delivery_exceptions" TO "anon";
GRANT ALL ON TABLE "public"."order_items_delivery_exceptions" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items_delivery_exceptions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."order_items_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."order_items_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."order_items_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."payment_receipts" TO "anon";
GRANT ALL ON TABLE "public"."payment_receipts" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_receipts" TO "service_role";



GRANT ALL ON TABLE "public"."processed_events" TO "anon";
GRANT ALL ON TABLE "public"."processed_events" TO "authenticated";
GRANT ALL ON TABLE "public"."processed_events" TO "service_role";



GRANT ALL ON TABLE "public"."sales_kpi_daily" TO "anon";
GRANT ALL ON TABLE "public"."sales_kpi_daily" TO "authenticated";
GRANT ALL ON TABLE "public"."sales_kpi_daily" TO "service_role";



GRANT ALL ON TABLE "public"."state_changes" TO "anon";
GRANT ALL ON TABLE "public"."state_changes" TO "authenticated";
GRANT ALL ON TABLE "public"."state_changes" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































