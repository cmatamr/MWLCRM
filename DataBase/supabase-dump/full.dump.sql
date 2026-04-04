SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict tMWt94PnClgl4ljuPDIeOhbaSHUhqJ5gc1m1eN25sJpNnbQycWt9nsd3Th5jCg8

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."audit_log_entries" ("instance_id", "id", "payload", "created_at", "ip_address") FROM stdin;
\.


--
-- Data for Name: custom_oauth_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."custom_oauth_providers" ("id", "provider_type", "identifier", "name", "client_id", "client_secret", "acceptable_client_ids", "scopes", "pkce_enabled", "attribute_mapping", "authorization_params", "enabled", "email_optional", "issuer", "discovery_url", "skip_nonce_check", "cached_discovery", "discovery_cached_at", "authorization_url", "token_url", "userinfo_url", "jwks_uri", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."flow_state" ("id", "user_id", "auth_code", "code_challenge_method", "code_challenge", "provider_type", "provider_access_token", "provider_refresh_token", "created_at", "updated_at", "authentication_method", "auth_code_issued_at", "invite_token", "referrer", "oauth_client_state_id", "linking_target_id", "email_optional") FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") FROM stdin;
\.


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") FROM stdin;
\.


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."instances" ("id", "uuid", "raw_base_config", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."oauth_clients" ("id", "client_secret_hash", "registration_type", "redirect_uris", "grant_types", "client_name", "client_uri", "logo_uri", "created_at", "updated_at", "deleted_at", "client_type", "token_endpoint_auth_method") FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."sessions" ("id", "user_id", "created_at", "updated_at", "factor_id", "aal", "not_after", "refreshed_at", "user_agent", "ip", "tag", "oauth_client_id", "refresh_token_hmac_key", "refresh_token_counter", "scopes") FROM stdin;
\.


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."mfa_amr_claims" ("session_id", "created_at", "updated_at", "authentication_method", "id") FROM stdin;
\.


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."mfa_factors" ("id", "user_id", "friendly_name", "factor_type", "status", "created_at", "updated_at", "secret", "phone", "last_challenged_at", "web_authn_credential", "web_authn_aaguid", "last_webauthn_challenge_data") FROM stdin;
\.


--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."mfa_challenges" ("id", "factor_id", "created_at", "verified_at", "ip_address", "otp_code", "web_authn_session_data") FROM stdin;
\.


--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."oauth_authorizations" ("id", "authorization_id", "client_id", "user_id", "redirect_uri", "scope", "state", "resource", "code_challenge", "code_challenge_method", "response_type", "status", "authorization_code", "created_at", "expires_at", "approved_at", "nonce") FROM stdin;
\.


--
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."oauth_client_states" ("id", "provider_type", "code_verifier", "created_at") FROM stdin;
\.


--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."oauth_consents" ("id", "user_id", "client_id", "scopes", "granted_at", "revoked_at") FROM stdin;
\.


--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."one_time_tokens" ("id", "user_id", "token_type", "token_hash", "relates_to", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."refresh_tokens" ("instance_id", "id", "token", "user_id", "revoked", "created_at", "updated_at", "parent", "session_id") FROM stdin;
\.


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."sso_providers" ("id", "resource_id", "created_at", "updated_at", "disabled") FROM stdin;
\.


--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."saml_providers" ("id", "sso_provider_id", "entity_id", "metadata_xml", "metadata_url", "attribute_mapping", "created_at", "updated_at", "name_id_format") FROM stdin;
\.


--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."saml_relay_states" ("id", "sso_provider_id", "request_id", "for_email", "redirect_to", "created_at", "updated_at", "flow_state_id") FROM stdin;
\.


--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."sso_domains" ("id", "sso_provider_id", "domain", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: webauthn_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."webauthn_challenges" ("id", "user_id", "challenge_type", "session_data", "created_at", "expires_at") FROM stdin;
\.


--
-- Data for Name: webauthn_credentials; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."webauthn_credentials" ("id", "user_id", "credential_id", "public_key", "attestation_type", "aaguid", "sign_count", "transports", "backup_eligible", "backed_up", "friendly_name", "created_at", "updated_at", "last_used_at") FROM stdin;
\.


--
-- Data for Name: contacts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."contacts" ("id", "primary_channel", "external_id", "display_name", "tags", "created_at", "updated_at", "total_orders", "total_spent_crc", "last_order_at", "customer_status") FROM stdin;
380b34f3-8a87-4455-8dec-1e31570403fa	wa	+50688928728	Carlos Mata	{}	2026-03-25 04:02:00.701812+00	2026-03-25 04:02:00.701812+00	0	0.00	\N	\N
28c8f937-9baa-4bc0-9e68-fa11031eb9fe	wa	+50684732111	4 mas uno Technology	{}	2026-03-26 04:29:45.460476+00	2026-03-26 04:29:45.460476+00	0	0.00	\N	\N
28a1d2cd-622b-46a7-87e1-0b6a1d6fb095	wa	88980098	Daniel Mata	{}	2026-04-02 02:41:45.808+00	2026-04-02 02:41:45.808+00	0	0.00	\N	Activo
\.


--
-- Data for Name: lead_threads; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."lead_threads" ("id", "lead_thread_key", "channel", "mode", "owner", "ai_lock_until", "last_customer_ts", "last_human_ts", "last_ai_ts", "lead_stage", "lead_score", "created_at", "updated_at", "contact_id", "stage_confidence", "stage_source", "stage_locked", "stage_lock_reason", "last_agent_assessment_at", "last_human_override_at", "intent_level", "requirement_clarity", "quote_readiness", "abandonment_risk", "budget_status", "urgency_level", "stage_reason", "stage_evidence") FROM stdin;
68f01174-621c-4a28-9401-98e1e14b631a	+50688928728	wa	ai	karol	\N	2026-03-31 04:20:51+00	\N	\N	new	0	2026-03-26 03:39:49.016827+00	2026-03-31 04:21:03.323927+00	380b34f3-8a87-4455-8dec-1e31570403fa	\N	system	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}
ca6e26a1-147c-498a-8bf5-b0f83c4df99f	+50684732111	wa	ai	karol	\N	2026-03-28 22:07:04+00	\N	\N	new	0	2026-03-26 04:29:45.569294+00	2026-03-28 22:07:11.48014+00	28c8f937-9baa-4bc0-9e68-fa11031eb9fe	\N	system	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}
\.


--
-- Data for Name: alerts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."alerts" ("id", "lead_thread_id", "alert_type", "channel", "priority", "recipient", "status", "payload", "created_at") FROM stdin;
\.


--
-- Data for Name: banks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."banks" ("id", "name", "code", "is_active", "created_at") FROM stdin;
8ef01a70-f154-4c33-b512-4be4ce3152fb	BAC Credomatic	BAC	t	2026-04-02 08:51:19.44819+00
4b41bf2c-e52f-43f7-8ed3-279852dff72d	Banco Nacional	BN	t	2026-04-02 08:51:19.44819+00
1a796a68-b8c7-41f2-9896-96d1fafe72f9	Banco de Costa Rica	BCR	t	2026-04-02 08:51:19.44819+00
bd44cf09-865f-4169-9dc8-50b6d54a5eef	Scotiabank	SCOTIA	t	2026-04-02 08:51:19.44819+00
3418665f-ebff-49c8-824e-d6985c02e20f	Davivienda	DAV	t	2026-04-02 08:51:19.44819+00
a7c57808-691e-4262-869f-3d056df258c6	Banco Popular	BP	t	2026-04-02 08:51:19.44819+00
fbfdc154-9e2f-417c-bb37-9f20771e748f	Banco Promerica	PROMERICA	t	2026-04-02 08:51:19.44819+00
5a40d338-04de-431d-b65d-8291ea02f91d	Banco Lafise	LAFISE	t	2026-04-02 08:51:19.44819+00
5fffe8cd-04fe-49cd-9e2e-27bc5b150241	Mucap	MUCAP	t	2026-04-02 08:51:19.44819+00
\.


--
-- Data for Name: campaigns; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."campaigns" ("id", "name", "platform", "objective", "start_date", "end_date", "created_at", "meta_campaign_id", "status", "updated_at") FROM stdin;
\.


--
-- Data for Name: campaign_attribution; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."campaign_attribution" ("id", "lead_thread_id", "source", "campaign_id", "adset_id", "creative_id", "referral_payload", "first_touch_at", "campaign_uuid") FROM stdin;
\.


--
-- Data for Name: campaign_spend; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."campaign_spend" ("id", "campaign_id", "date", "amount_crc", "created_at", "impressions", "clicks", "cpc", "ctr") FROM stdin;
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."messages" ("id", "lead_thread_id", "sender_type", "text", "attachments", "provider", "external_message_id", "cw_message_id", "provider_ts", "received_ts", "hash_dedupe", "created_at") FROM stdin;
\.


--
-- Data for Name: conversation_objections; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."conversation_objections" ("id", "lead_thread_id", "message_id", "objection_type", "objection_subtype", "detected_from", "confidence", "created_at", "resolved_at", "status", "severity", "detected_by", "evidence_excerpt", "evidence_json", "resolved_by", "resolution_notes") FROM stdin;
\.


--
-- Data for Name: conversation_state; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."conversation_state" ("session_id", "ai_lock_until", "updated_at") FROM stdin;
\.


--
-- Data for Name: cw_mapping; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."cw_mapping" ("id", "conversation_key", "cw_inbox_id", "cw_contact_id", "cw_conversation_id", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: followups; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."followups" ("id", "lead_thread_id", "due_at", "status", "attempt", "template_key", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: lead_agent_assessments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."lead_agent_assessments" ("id", "lead_thread_id", "message_id", "proposed_stage", "confidence", "lead_score", "intent_level", "requirement_clarity", "quote_readiness", "abandonment_risk", "budget_status", "urgency_level", "should_advance", "should_hold", "should_fallback", "rationale_text", "evidence_excerpt", "rationale_json", "evidence_json", "model_name", "created_at") FROM stdin;
\.


--
-- Data for Name: funnel_stage_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."funnel_stage_history" ("id", "lead_thread_id", "stage", "entered_at", "exited_at", "duration_seconds", "reason", "created_at", "from_stage", "to_stage", "source", "confidence", "changed_by", "message_id", "assessment_id", "evidence_excerpt", "evidence_json") FROM stdin;
\.


--
-- Data for Name: mwl_business_policies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."mwl_business_policies" ("key", "value_text", "value_json", "updated_at") FROM stdin;
discount_offer_policy	El agente nunca debe ofrecer descuentos antes de que el cliente lo solicite.	\N	2026-03-07 21:53:30.778634
bulk_discount_review_policy	Los descuentos en pedidos mayores a 30 unidades se evalúan manualmente. El agente no debe prometer porcentaje ni ofrecer descuento de forma espontanea.	{"min_qty": 31, "offer_proactively": false, "requires_manual_review": true, "promise_specific_discount": false}	2026-03-07 21:53:30.778634
payment_policy	Se requiere adelanto del 60 por ciento para iniciar.	{"deposit_percent": 60}	2026-03-07 21:53:30.778634
design_timeline_policy	Después del adelanto se inicia diseño. El proceso suele durar alrededor de una semana.	{"estimated_design_time_days": 7}	2026-03-07 21:53:30.778634
design_approval_policy	El diseño debe aprobarse antes de producción.	{"design_approval_required": true}	2026-03-07 21:53:30.778634
final_payment_policy	Antes del envio debe cancelarse el saldo pendiente.	{"final_payment_before_shipping": true}	2026-03-07 21:53:30.778634
payment_methods	\N	["SINPE Móvil", "transferencia bancaria"]	2026-03-07 21:53:30.778634
delivery_methods	\N	["retiro", "Correos de Costa Rica"]	2026-03-07 21:53:30.778634
bag_name_personalization_policy	Se puede incluir nombre individual por invitado sin costo adicional en la línea de bolsos actualizada.	{"free_individual_name": true}	2026-03-07 21:53:30.778634
bag_design_adjustment_policy	Incluye 1 ajuste de diseño sin costo. Cambios adicionales pueden generar costo extra.	{"included_adjustments": 1, "additional_changes_may_have_cost": true}	2026-03-07 21:53:30.778634
funnel_rules	\N	{"stale_hours_new": 24, "stale_hours_quote": 72, "allow_agent_auto_won": false, "allow_agent_auto_lost": false, "stale_hours_qualified": 48, "min_confidence_auto_lost": 0.90, "min_confidence_auto_stage": 0.75, "allow_agent_move_if_stage_locked": false}	2026-04-03 05:29:10.880142
\.


--
-- Data for Name: mwl_products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."mwl_products" ("id", "sku", "family", "name", "category", "variant_label", "size_label", "width_cm", "height_cm", "depth_cm", "material", "base_color", "print_type", "personalization_area", "price_crc", "price_from_crc", "min_qty", "allows_name", "includes_design_adjustment_count", "extra_adjustment_has_cost", "requires_design_approval", "is_full_color", "is_premium", "is_discountable", "discount_visibility", "pricing_mode", "summary", "details", "notes", "source_type", "source_ref", "is_active", "is_agent_visible", "sort_order", "updated_at", "search_boost") FROM stdin;
book_coloring_std	MWL-BOOK-COLORING-STD	libro_colorear	Libro para colorear personalizado	coleccion_creativa	estandar	1/2 carta	\N	\N	\N	papel impreso + portada cartulina	\N	impresion alta calidad	portada e interiores	1600	\N	1	t	0	f	t	f	f	f	never	fixed	Libro para colorear totalmente personalizado.	Formato 1/2 carta, impresión de excelente calidad, portada resistente y 20 páginas internas.	\N	catalog_pdf	Fiestas2026.pdf	t	t	10	2026-03-07 21:53:30.778634	0
pillow_coloring_20x20	MWL-PILLOW-COLOR-20X20	almohadon_colorear	Almohadón para colorear 20x20 cm	coleccion_creativa	estandar	20x20 cm	20.00	20.00	\N	tela	\N	impresion alta calidad	frontal	2800	\N	1	t	0	f	t	f	f	f	never	fixed	Almohadón para colorear personalizado.	Incluye 12 marcadores.	\N	catalog_pdf	Fiestas2026.pdf	t	t	20	2026-03-07 21:53:30.778634	0
kit_creativo_std	MWL-KIT-CREATIVO-STD	kit_creativo	Kit creativo personalizado	kits	estandar	\N	\N	\N	\N	\N	\N	\N	\N	\N	4500	10	t	0	f	t	f	f	f	never	from	Kit personalizado para celebraciones.	Incluye libro de colorear, vaso personalizado, bolso confitero y crayolas.	\N	catalog_pdf	Fiestas2026.pdf	t	t	30	2026-03-07 21:53:30.778634	0
candy_box_relieve_15_6x7_5x11	MWL-CB-RELIEVE-15.6X7.5X11	candy_box_relieve	Candy Box relieve 15.6x7.5x11 cm	cajas	estandar	15.6x7.5x11 cm	15.60	11.00	7.50	cartulina	kraft o blanco	impresion + relieve	frontal y fondo	1450	\N	1	f	0	f	t	f	f	f	never	fixed	Caja para dulces con detalles en relieve.	Con fondo impreso.	\N	catalog_pdf	Fiestas2026.pdf	t	t	40	2026-03-07 21:53:30.778634	0
banner_flags_std	MWL-BANNER-FLAGS-STD	banderines	Banderines personalizados	decoracion	estandar	\N	\N	\N	\N	\N	\N	\N	\N	\N	7500	1	f	0	f	t	f	f	f	never	from	Banderines personalizados.	\N	\N	catalog_pdf	Fiestas2026.pdf	t	t	50	2026-03-07 21:53:30.778634	0
chip_bags_std	MWL-CHIP-BAGS-STD	chip_bags	Chip bags personalizados	complementos	estandar	\N	\N	\N	\N	papel couche	\N	impresion	\N	850	\N	12	f	0	f	t	f	f	f	never	fixed	Bolsitas impresas para snacks.	Incluyen cinta para el cierre. No incluye relleno.	\N	catalog_pdf	Fiestas2026.pdf	t	t	60	2026-03-07 21:53:30.778634	0
party_hats_std	MWL-PARTY-HATS-STD	party_hats	Party hats personalizados	complementos	estandar	\N	\N	\N	\N	\N	\N	impresion	\N	900	\N	12	f	0	f	t	f	f	f	never	fixed	Gorritos de fiesta personalizados.	Según temática.	\N	catalog_pdf	Fiestas2026.pdf	t	t	70	2026-03-07 21:53:30.778634	0
bag_confitero_20x25_std	MWL-BAG-CONF-20X25-STD	confitero	Confitero 20x25 cm	bolsos	estandar	20x25 cm	20.00	25.00	\N	tela poliester	blanco	sublimacion frontal	frontal	1000	\N	5	t	1	t	t	f	f	f	only_if_customer_requests	fixed	Bolso confitero en tela blanca.	Personalización temática frontal.	Se puede incluir nombre del invitado sin costo adicional.	owner_direct	Actualizacion manual bolsos marzo 2026	t	t	80	2026-03-07 21:53:30.778634	3
bag_confitero_30x35_std	MWL-BAG-CONF-30X35-STD	confitero	Confitero 30x35 cm	bolsos	estandar	30x35 cm	30.00	35.00	\N	tela poliester	blanco	sublimacion frontal	frontal	1300	\N	5	t	1	t	t	f	f	f	only_if_customer_requests	fixed	Bolso confitero en tela blanca.	Personalización temática frontal.	Se puede incluir nombre del invitado sin costo adicional.	owner_direct	Actualizacion manual bolsos marzo 2026	t	t	90	2026-03-07 21:53:30.778634	3
bag_caminata_20x25_std	MWL-BAG-CAM-20X25-STD	caminata	Caminata 20x25 cm Fondo Blanco	bolsos	estandar	20x25 cm	20.00	25.00	\N	tela poliester	blanco	sublimacion frontal	frontal	1700	\N	5	t	1	t	t	f	f	f	only_if_customer_requests	fixed	Bolso tipo caminata en tela blanca.	Personalización temática frontal.	Se puede incluir nombre del invitado sin costo adicional.	owner_direct	Actualizacion manual bolsos marzo 2026	t	t	100	2026-03-07 21:53:30.778634	5
bag_caminata_30x35_std	MWL-BAG-CAM-30X35-STD	caminata	Caminata 30x35 cm Fondo Blanco	bolsos	estandar	30x35 cm	30.00	35.00	\N	tela poliester	blanco	sublimacion frontal	frontal	1900	\N	5	t	1	t	t	f	f	f	only_if_customer_requests	fixed	Bolso tipo caminata en tela blanca.	Diseño frontal temático.	Se puede incluir nombre sin costo adicional.	owner_direct	Actualizacion manual bolsos marzo 2026	t	t	110	2026-03-07 21:53:30.778634	4
bag_caminata_20x25_full	MWL-BAG-CAM-20X25-FULL	caminata	Caminata 20x25 cm Full Sublimada	bolsos	premium	20x25 cm	20.00	25.00	\N	tela poliester	\N	full sublimacion	completa	2500	\N	5	t	1	t	t	t	t	t	only_if_customer_requests	fixed	Bolso tipo caminata completamente sublimado.	Parte trasera puede ser de color. Es la unica opcion totalmente colorida.	Tiene descuento del 5% solo en pedidos mayores a 15 unidades. El agente no debe ofrecerlo si el cliente no lo pide.	owner_direct	Actualizacion manual bolsos marzo 2026	t	t	120	2026-03-07 21:53:30.778634	5
bag_tote_20x30_std	MWL-BAG-TOTE-20X30-STD	tote_bag	Tote Bag 20x30 cm	bolsos	estandar	20x30 cm	20.00	30.00	\N	tela poliester	blanco	sublimacion frontal	frontal	1300	\N	5	t	1	t	t	f	f	f	only_if_customer_requests	fixed	Tote bag en tela blanca.	Diseño frontal temático.	Se puede incluir nombre sin costo adicional.	owner_direct	Actualizacion manual bolsos marzo 2026	t	t	130	2026-03-07 21:53:30.778634	0
clear_bag_22x7x17	MWL-CLEAR-BAG-22X7X17	clear_bag	Clear Bag 22x7x17 cm	bolsos	estandar	22x7x17 cm	22.00	17.00	7.00	PVC	transparente	decoracion	frontal	2200	\N	1	f	0	f	t	f	f	f	never	fixed	Bolsa transparente decorada.	Decorada con la temática de la fiesta.	\N	catalog_pdf	Fiestas2026.pdf	t	t	140	2026-03-07 21:53:30.778634	0
cups_vinyl_std	MWL-CUP-VINYL-STD	vasos_personalizados	Vasos personalizados	vasos	estandar	\N	\N	\N	\N	plastico	\N	vinil	frontal	2200	\N	1	f	0	f	t	f	f	f	never	fixed	Vasos personalizados estampados en vinil.	\N	\N	catalog_pdf	Fiestas2026.pdf	t	t	150	2026-03-07 21:53:30.778634	0
candy_box_3d_15_6x7_5x11	MWL-CB-3D-15.6X7.5X11	candy_box_3d	Candy Box 3D 15.6x7.5x11 cm	cajas	premium	15.6x7.5x11 cm	15.60	11.00	7.50	cartulina	kraft o blanco	impresion 3D	frontal y fondo	2200	\N	1	f	0	f	t	f	t	f	never	fixed	Caja para dulces con detalles impresos 3D.	Con fondo impreso.	\N	catalog_pdf	Fiestas2026.pdf	t	t	160	2026-03-07 21:53:30.778634	0
bag_confitero_20x25_full	MWL-BAG-CONF-20X25-FULL	confitero	Bolso tipo confitero premium 20x25 cm	bolsos	premium	20x25 cm	20.00	25.00	\N	tela poliester	\N	full sublimacion	completa	1600	\N	12	t	0	f	t	t	t	f	only_if_customer_requests	fixed	Bolso confitero premium totalmente sublimado.	Tela trasera de color.	\N	catalog_pdf	Fiestas2026.pdf	t	t	170	2026-03-07 21:53:30.778634	4
shirt_custom_from	MWL-SHIRT-CUSTOM-FROM	camisetas	Camisetas personalizadas	ropa	desde	\N	\N	\N	\N	tela	blancas y de color	impresion	frontal	\N	9500	1	f	0	f	t	f	f	f	never	from	Camisetas personalizadas para niños y adultos.	El valor puede variar según diseño.	\N	catalog_pdf	Fiestas2026.pdf	t	t	180	2026-03-07 21:53:30.778634	0
\.


--
-- Data for Name: mwl_discount_rules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."mwl_discount_rules" ("id", "product_id", "min_qty", "discount_percent", "discount_amount_crc", "rule_type", "notes", "is_active") FROM stdin;
1	bag_caminata_20x25_full	16	5.00	\N	never_offer_proactively	Aplicar solo si el cliente pregunta por descuento o cotiza cantidad alta. Nunca ofrecer de forma espontanea.	t
\.


--
-- Data for Name: mwl_product_aliases; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."mwl_product_aliases" ("id", "product_id", "alias") FROM stdin;
1	book_coloring_std	libro para colorear
2	book_coloring_std	libro de colorear
3	book_coloring_std	cuaderno para colorear
4	pillow_coloring_20x20	almohadon para colorear
5	pillow_coloring_20x20	cojin para colorear
6	kit_creativo_std	kit creativo
7	kit_creativo_std	kit personalizado
8	kit_creativo_std	combo creativo
9	candy_box_relieve_15_6x7_5x11	candy box relieve
10	candy_box_relieve_15_6x7_5x11	caja dulce relieve
11	banner_flags_std	banderines
12	banner_flags_std	guirnalda
13	chip_bags_std	chip bags
14	chip_bags_std	bolsitas de snacks
15	chip_bags_std	bolsitas personalizadas
16	party_hats_std	party hats
17	party_hats_std	gorritos
18	party_hats_std	sombreritos de fiesta
19	bag_confitero_20x25_std	confitero
20	bag_confitero_20x25_std	saquito confitero
21	bag_confitero_20x25_std	bolso confitero
22	bag_confitero_20x25_std	candy bag tela
23	bag_confitero_30x35_std	confitero grande
24	bag_confitero_30x35_std	saquito confitero grande
25	bag_caminata_20x25_std	caminata
26	bag_caminata_20x25_std	bolso caminata
27	bag_caminata_20x25_std	bolso tipo caminata
28	bag_caminata_30x35_std	caminata grande
29	bag_caminata_30x35_std	bolso caminata grande
30	bag_caminata_20x25_full	caminata premium
31	bag_caminata_20x25_full	caminata full sublimada
32	bag_caminata_20x25_full	caminata colorida
33	bag_caminata_20x25_full	bolso premium caminata
34	bag_tote_20x30_std	tote
35	bag_tote_20x30_std	tote bag
36	bag_tote_20x30_std	bolso tote
37	clear_bag_22x7x17	clear bag
38	clear_bag_22x7x17	bolsa transparente
39	clear_bag_22x7x17	bolsa pvc
40	cups_vinyl_std	vasos
41	cups_vinyl_std	vasos personalizados
42	cups_vinyl_std	vasos en vinil
43	candy_box_3d_15_6x7_5x11	candy box 3d
44	candy_box_3d_15_6x7_5x11	caja 3d
45	bag_confitero_20x25_full	bolso confitero premium
46	bag_confitero_20x25_full	confitero premium
47	bag_confitero_20x25_full	bolso sublimado premium
48	shirt_custom_from	camisetas
49	shirt_custom_from	camisetas personalizadas
50	shirt_custom_from	shirt personalizada
\.


--
-- Data for Name: mwl_product_images; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."mwl_product_images" ("id", "product_id", "storage_bucket", "storage_path", "alt_text", "is_primary", "sort_order", "created_at") FROM stdin;
4	bag_caminata_20x25_full	mwl-products	products/bag_caminata_20x25_full/main.jpeg	Bolso tipo caminata 20x25 cm full sublimado	t	0	2026-03-09 16:15:27
5	bag_confitero_20x25_std	mwl-products	products/bag_confitero_20x25_std/main.jpeg	Bolso tipo caminata 20x25 cm standard	t	0	2026-03-09 16:17:40
6	cups_vinyl_std	mwl-products	products/cups_vinyl_std/main.jpeg	Vaso personalizado	t	0	2026-03-09 16:18:56
\.


--
-- Data for Name: mwl_product_search_index; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."mwl_product_search_index" ("product_id", "category", "family", "name", "summary", "details", "aliases", "search_boost", "search_text", "search_text_normalized", "updated_at", "search_vector") FROM stdin;
book_coloring_std	coleccion_creativa	libro_colorear	Libro para colorear personalizado	Libro para colorear totalmente personalizado.	Formato 1/2 carta, impresión de excelente calidad, portada resistente y 20 páginas internas.	{"cuaderno para colorear","libro de colorear","libro para colorear"}	0	Libro para colorear personalizado coleccion_creativa libro_colorear Libro para colorear totalmente personalizado. Formato 1/2 carta, impresión de excelente calidad, portada resistente y 20 páginas internas. cuaderno para colorear libro de colorear libro para colorear	libro para colorear personalizado coleccion_creativa libro_colorear libro para colorear totalmente personalizado. formato 1/2 carta, impresión de excelente calidad, portada resistente y 20 páginas internas. cuaderno para colorear libro de colorear libro para colorear	2026-03-10 02:51:20.494894	'1/2':24C '20':33C 'calidad':29C 'carta':25C 'coleccion':7B 'colorear':3A,6A,11A,14A,17A,20B 'creativa':8B 'cuaderno':9A 'de':13A,27C 'excelente':28C 'formato':23C 'impresión':26C 'internas':35C 'libro':1A,5A,12A,15A,18B 'para':2A,10A,16A,19B 'personalizado':4A,22B 'portada':30C 'páginas':34C 'resistente':31C 'totalmente':21B 'y':32C
pillow_coloring_20x20	coleccion_creativa	almohadon_colorear	Almohadón para colorear 20x20 cm	Almohadón para colorear personalizado.	Incluye 12 marcadores.	{"almohadon para colorear","cojin para colorear"}	0	Almohadón para colorear 20x20 cm coleccion_creativa almohadon_colorear Almohadón para colorear personalizado. Incluye 12 marcadores. almohadon para colorear cojin para colorear	almohadón para colorear 20x20 cm coleccion_creativa almohadon_colorear almohadón para colorear personalizado. incluye 12 marcadores. almohadon para colorear cojin para colorear	2026-03-10 02:51:20.494894	'12':21C '20x20':4A 'almohadon':6A,10A 'almohadón':1A,16B 'cm':5A 'cojin':13A 'coleccion':8B 'colorear':3A,7A,12A,15A,18B 'creativa':9B 'incluye':20C 'marcadores':22C 'para':2A,11A,14A,17B 'personalizado':19B
kit_creativo_std	kits	kit_creativo	Kit creativo personalizado	Kit personalizado para celebraciones.	Incluye libro de colorear, vaso personalizado, bolso confitero y crayolas.	{"combo creativo","kit creativo","kit personalizado"}	0	Kit creativo personalizado kits kit_creativo Kit personalizado para celebraciones. Incluye libro de colorear, vaso personalizado, bolso confitero y crayolas. combo creativo kit creativo kit personalizado	kit creativo personalizado kit kit_creativo kit personalizado para celebraciones. incluye libro de colorear, vaso personalizado, bolso confitero y crayolas. combo creativo kit creativo kit personalizado	2026-03-10 02:51:20.494894	'bolso':23C 'celebraciones':16B 'colorear':20C 'combo':7A 'confitero':24C 'crayolas':26C 'creativo':2A,5A,8A,10A 'de':19C 'incluye':17C 'kit':1A,4A,9A,11A,13B 'kits':6B 'libro':18C 'para':15B 'personalizado':3A,12A,14B,22C 'vaso':21C 'y':25C
candy_box_relieve_15_6x7_5x11	cajas	candy_box_relieve	Candy Box relieve 15.6x7.5x11 cm	Caja para dulces con detalles en relieve.	Con fondo impreso.	{"caja dulce relieve","candy box relieve"}	0	Candy Box relieve 15.6x7.5x11 cm cajas candy_box_relieve Caja para dulces con detalles en relieve. Con fondo impreso. caja dulce relieve candy box relieve	candy box relieve 15.6x7.5x11 cm caja candy_box_relieve caja para dulc con detall en relieve. con fondo impreso. caja dulce relieve candy box relieve	2026-03-10 02:51:20.494894	'15.6':4A 'box':2A,8A,15A 'caja':11A,17B 'cajas':10B 'candy':1A,7A,14A 'cm':6A 'con':20B,24C 'detalles':21B 'dulce':12A 'dulces':19B 'en':22B 'fondo':25C 'impreso':26C 'para':18B 'relieve':3A,9A,13A,16A,23B 'x7.5x11':5A
banner_flags_std	decoracion	banderines	Banderines personalizados	Banderines personalizados.	\N	{banderines,guirnalda}	0	Banderines personalizados decoracion banderines Banderines personalizados. banderines guirnalda	banderin personalizado decoracion banderin banderin personalizados. banderin guirnalda	2026-03-10 02:51:20.494894	'banderines':1A,3A,5A,7B 'decoracion':4B 'guirnalda':6A 'personalizados':2A,8B
chip_bags_std	complementos	chip_bags	Chip bags personalizados	Bolsitas impresas para snacks.	Incluyen cinta para el cierre. No incluye relleno.	{"bolsitas de snacks","bolsitas personalizadas","chip bags"}	0	Chip bags personalizados complementos chip_bags Bolsitas impresas para snacks. Incluyen cinta para el cierre. No incluye relleno. bolsitas de snacks bolsitas personalizadas chip bags	chip bag personalizado complemento chip_bags bolsita impresa para snacks. incluyen cinta para el cierre. no incluye relleno. bolsita de snack bolsita personalizada chip bag	2026-03-10 02:51:20.494894	'bags':2A,5A,13A 'bolsitas':7A,10A,14B 'chip':1A,4A,12A 'cierre':22C 'cinta':19C 'complementos':6B 'de':8A 'el':21C 'impresas':15B 'incluye':24C 'incluyen':18C 'no':23C 'para':16B,20C 'personalizadas':11A 'personalizados':3A 'relleno':25C 'snacks':9A,17B
party_hats_std	complementos	party_hats	Party hats personalizados	Gorritos de fiesta personalizados.	Según temática.	{gorritos,"party hats","sombreritos de fiesta"}	0	Party hats personalizados complementos party_hats Gorritos de fiesta personalizados. Según temática. gorritos party hats sombreritos de fiesta	party hat personalizado complemento party_hats gorrito de fiesta personalizados. según temática. gorrito party hat sombrerito de fiesta	2026-03-10 02:51:20.494894	'complementos':6B 'de':11A,14B 'fiesta':12A,15B 'gorritos':7A,13B 'hats':2A,5A,9A 'party':1A,4A,8A 'personalizados':3A,16B 'según':17C 'sombreritos':10A 'temática':18C
bag_confitero_20x25_std	bolsos	confitero	Confitero 20x25 cm	Bolso confitero en tela blanca.	Personalización temática frontal.	{"bolso confitero","candy bag tela",confitero,"saquito confitero"}	3	Confitero 20x25 cm bolsos confitero Bolso confitero en tela blanca. Personalización temática frontal. bolso confitero candy bag tela confitero saquito confitero	confitero 20x25 cm bolso confitero bolso confitero en tela blanca. personalización temática frontal. bolso confitero candy bag tela confitero saquito confitero	2026-03-10 02:51:20.494894	'20x25':2A 'bag':9A 'blanca':18B 'bolso':6A,14B 'bolsos':5B 'candy':8A 'cm':3A 'confitero':1A,4A,7A,11A,13A,15B 'en':16B 'frontal':21C 'personalización':19C 'saquito':12A 'tela':10A,17B 'temática':20C
bag_confitero_30x35_std	bolsos	confitero	Confitero 30x35 cm	Bolso confitero en tela blanca.	Personalización temática frontal.	{"bolso confitero","candy bag tela","confitero grande","saquito confitero grande","saquito confitero"}	3	Confitero 30x35 cm bolsos confitero Bolso confitero en tela blanca. Personalización temática frontal. bolso confitero candy bag tela confitero grande saquito confitero grande saquito confitero	confitero 30x35 cm bolso confitero bolso confitero en tela blanca. personalización temática frontal. bolso confitero candy bag tela confitero grande saquito confitero grande saquito confitero	2026-03-10 02:51:20.494894	'30x35':2A 'bag':9A 'blanca':22B 'bolso':6A,18B 'bolsos':5B 'candy':8A 'cm':3A 'confitero':1A,4A,7A,11A,14A,17A,19B 'en':20B 'frontal':25C 'grande':12A,15A 'personalización':23C 'saquito':13A,16A 'tela':10A,21B 'temática':24C
bag_caminata_20x25_std	bolsos	caminata	Caminata 20x25 cm Fondo Blanco	Bolso tipo caminata en tela blanca.	Personalización temática frontal.	{"bolso caminata","bolso tipo caminata",caminata,"bolso de espalda",backpack,"bolsos tipo backpack",mochilita}	5	Caminata 20x25 cm Fondo Blanco bolsos caminata Bolso tipo caminata en tela blanca. Personalización temática frontal. bolso caminata bolso tipo caminata caminata bolso de espalda backpack bolsos tipo backpack mochilita	caminata 20x25 cm fondo blanco bolso caminata bolso tipo caminata en tela blanca. personalización temática frontal. bolso caminata bolso tipo caminata caminata bolso de espalda backpack bolso tipo backpack mochilita	2026-03-10 02:51:20.494894	'20x25':2A 'backpack':17A,20A 'blanca':27B 'blanco':5A 'bolso':8A,10A,14A,22B 'bolsos':7B,18A 'caminata':1A,6A,9A,12A,13A,24B 'cm':3A 'de':15A 'en':25B 'espalda':16A 'fondo':4A 'frontal':30C 'mochilita':21A 'personalización':28C 'tela':26B 'temática':29C 'tipo':11A,19A,23B
bag_caminata_30x35_std	bolsos	caminata	Caminata 30x35 cm Fondo Blanco	Bolso tipo caminata en tela blanca.	Diseño frontal temático.	{"bolso caminata","bolso caminata grande","bolso tipo caminata","caminata grande","bolso de espalda",backpack,"bolsos tipo backpack",mochilita}	4	Caminata 30x35 cm Fondo Blanco bolsos caminata Bolso tipo caminata en tela blanca. Diseño frontal temático. bolso caminata bolso caminata grande bolso tipo caminata caminata grande bolso de espalda backpack bolsos tipo backpack mochilita	caminata 30x35 cm fondo blanco bolso caminata bolso tipo caminata en tela blanca. diseño frontal temático. bolso caminata bolso caminata grande bolso tipo caminata caminata grande bolso de espalda backpack bolso tipo backpack mochilita	2026-03-10 02:51:20.494894	'30x35':2A 'backpack':21A,24A 'blanca':31B 'blanco':5A 'bolso':8A,10A,13A,18A,26B 'bolsos':7B,22A 'caminata':1A,6A,9A,11A,15A,16A,28B 'cm':3A 'de':19A 'diseño':32C 'en':29B 'espalda':20A 'fondo':4A 'frontal':33C 'grande':12A,17A 'mochilita':25A 'tela':30B 'temático':34C 'tipo':14A,23A,27B
bag_caminata_20x25_full	bolsos	caminata	Caminata 20x25 cm Full Sublimada	Bolso tipo caminata completamente sublimado.	Parte trasera puede ser de color. Es la unica opcion totalmente colorida.	{"bolso caminata","bolso premium caminata","bolso tipo caminata","caminata colorida","caminata full sublimada","caminata premium","bolso de espalda",backpack,"bolsos tipo backpack",mochilita}	5	Caminata 20x25 cm Full Sublimada bolsos caminata Bolso tipo caminata completamente sublimado. Parte trasera puede ser de color. Es la unica opcion totalmente colorida. bolso caminata bolso premium caminata bolso tipo caminata caminata colorida caminata full sublimada caminata premium bolso de espalda backpack bolsos tipo backpack mochilita	caminata 20x25 cm full sublimada bolso caminata bolso tipo caminata completamente sublimado. parte trasera puede ser de color. es la unica opcion totalmente colorida. bolso caminata bolso premium caminata bolso tipo caminata caminata colorida caminata full sublimada caminata premium bolso de espalda backpack bolso tipo backpack mochilita	2026-03-10 02:51:20.494894	'20x25':2A 'backpack':26A,29A 'bolso':8A,10A,13A,23A,31B 'bolsos':7B,27A 'caminata':1A,6A,9A,12A,15A,16A,18A,21A,33B 'cm':3A 'color':41C 'colorida':17A,47C 'completamente':34B 'de':24A,40C 'es':42C 'espalda':25A 'full':4A,19A 'la':43C 'mochilita':30A 'opcion':45C 'parte':36C 'premium':11A,22A 'puede':38C 'ser':39C 'sublimada':5A,20A 'sublimado':35B 'tipo':14A,28A,32B 'totalmente':46C 'trasera':37C 'unica':44C
bag_tote_20x30_std	bolsos	tote_bag	Tote Bag 20x30 cm	Tote bag en tela blanca.	Diseño frontal temático.	{"bolso tote",tote,"tote bag"}	0	Tote Bag 20x30 cm bolsos tote_bag Tote bag en tela blanca. Diseño frontal temático. bolso tote tote tote bag	tote bag 20x30 cm bolso tote_bag tote bag en tela blanca. diseño frontal temático. bolso tote tote tote bag	2026-03-10 02:51:20.494894	'20x30':3A 'bag':2A,6A,12A,14B 'blanca':17B 'bolso':8A 'bolsos':7B 'cm':4A 'diseño':18C 'en':15B 'frontal':19C 'tela':16B 'temático':20C 'tote':1A,5A,9A,10A,11A,13B
clear_bag_22x7x17	bolsos	clear_bag	Clear Bag 22x7x17 cm	Bolsa transparente decorada.	Decorada con la temática de la fiesta.	{"bolsa pvc","bolsa transparente","clear bag"}	0	Clear Bag 22x7x17 cm bolsos clear_bag Bolsa transparente decorada. Decorada con la temática de la fiesta. bolsa pvc bolsa transparente clear bag	clear bag 22x7x17 cm bolso clear_bag bolsa transparente decorada. decorada con la temática de la fiesta. bolsa pvc bolsa transparente clear bag	2026-03-10 02:51:20.494894	'22x7x17':3A 'bag':2A,6A,13A 'bolsa':8A,10A,14B 'bolsos':7B 'clear':1A,5A,12A 'cm':4A 'con':18C 'de':21C 'decorada':16B,17C 'fiesta':23C 'la':19C,22C 'pvc':9A 'temática':20C 'transparente':11A,15B
cups_vinyl_std	vasos	vasos_personalizados	Vasos personalizados	Vasos personalizados estampados en vinil.	\N	{vasos,"vasos en vinil","vasos personalizados"}	0	Vasos personalizados vasos vasos_personalizados Vasos personalizados estampados en vinil. vasos vasos en vinil vasos personalizados	vaso personalizado vaso vasos_personalizados vaso personalizado estampado en vinil. vaso vaso en vinil vaso personalizado	2026-03-10 02:51:20.494894	'en':8A,15B 'estampados':14B 'personalizados':2A,4A,11A,13B 'vasos':1A,3A,5B,6A,7A,10A,12B 'vinil':9A,16B
candy_box_3d_15_6x7_5x11	cajas	candy_box_3d	Candy Box 3D 15.6x7.5x11 cm	Caja para dulces con detalles impresos 3D.	Con fondo impreso.	{"caja 3d","candy box 3d"}	0	Candy Box 3D 15.6x7.5x11 cm cajas candy_box_3d Caja para dulces con detalles impresos 3D. Con fondo impreso. caja 3d candy box 3d	candy box 3d 15.6x7.5x11 cm caja candy_box_3d caja para dulc con detall impreso 3d. con fondo impreso. caja 3d candy box 3d	2026-03-10 02:51:20.494894	'15.6':4A '3d':3A,9A,12A,15A,22B 'box':2A,8A,14A 'caja':11A,16B 'cajas':10B 'candy':1A,7A,13A 'cm':6A 'con':19B,23C 'detalles':20B 'dulces':18B 'fondo':24C 'impreso':25C 'impresos':21B 'para':17B 'x7.5x11':5A
bag_confitero_20x25_full	bolsos	confitero	Bolso tipo confitero premium 20x25 cm	Bolso confitero premium totalmente sublimado.	Tela trasera de color.	{"bolso confitero","bolso confitero premium","bolso sublimado premium","candy bag tela","confitero premium","saquito confitero"}	4	Bolso tipo confitero premium 20x25 cm bolsos confitero Bolso confitero premium totalmente sublimado. Tela trasera de color. bolso confitero bolso confitero premium bolso sublimado premium candy bag tela confitero premium saquito confitero	bolso tipo confitero premium 20x25 cm bolso confitero bolso confitero premium totalmente sublimado. tela trasera de color. bolso confitero bolso confitero premium bolso sublimado premium candy bag tela confitero premium saquito confitero	2026-03-10 02:51:20.494894	'20x25':5A 'bag':18A 'bolso':1A,9A,11A,14A,24B 'bolsos':8B 'candy':17A 'cm':6A 'color':32C 'confitero':3A,7A,10A,12A,20A,23A,25B 'de':31C 'premium':4A,13A,16A,21A,26B 'saquito':22A 'sublimado':15A,28B 'tela':19A,29C 'tipo':2A 'totalmente':27B 'trasera':30C
shirt_custom_from	ropa	camisetas	Camisetas personalizadas	Camisetas personalizadas para niños y adultos.	El valor puede variar según diseño.	{camisetas,"camisetas personalizadas","shirt personalizada"}	0	Camisetas personalizadas ropa camisetas Camisetas personalizadas para niños y adultos. El valor puede variar según diseño. camisetas camisetas personalizadas shirt personalizada	camiseta personalizada ropa camiseta camiseta personalizada para niños y adultos. el valor puede variar según diseño. camiseta camiseta personalizada shirt personalizada	2026-03-10 02:51:20.494894	'adultos':15B 'camisetas':1A,3A,5A,6A,10B 'diseño':21C 'el':16C 'niños':13B 'para':12B 'personalizada':9A 'personalizadas':2A,7A,11B 'puede':18C 'ropa':4B 'según':20C 'shirt':8A 'valor':17C 'variar':19C 'y':14B
\.


--
-- Data for Name: mwl_product_search_terms; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."mwl_product_search_terms" ("id", "product_id", "family", "category", "term", "term_type", "priority", "is_active", "notes", "created_at") FROM stdin;
1	bag_caminata_20x25_full	caminata	bolsos	bolso premium caminata	alias	100	t	\N	2026-03-10 02:01:09.137162
2	bag_caminata_20x25_full	caminata	bolsos	caminata colorida	alias	100	t	\N	2026-03-10 02:01:09.137162
3	bag_caminata_20x25_full	caminata	bolsos	caminata full sublimada	alias	100	t	\N	2026-03-10 02:01:09.137162
4	bag_caminata_20x25_full	caminata	bolsos	caminata premium	alias	100	t	\N	2026-03-10 02:01:09.137162
5	bag_caminata_20x25_std	caminata	bolsos	bolso caminata	alias	100	t	\N	2026-03-10 02:01:09.137162
6	bag_caminata_20x25_std	caminata	bolsos	bolso tipo caminata	alias	100	t	\N	2026-03-10 02:01:09.137162
7	bag_caminata_20x25_std	caminata	bolsos	caminata	alias	100	t	\N	2026-03-10 02:01:09.137162
8	bag_caminata_30x35_std	caminata	bolsos	bolso caminata grande	alias	100	t	\N	2026-03-10 02:01:09.137162
9	bag_caminata_30x35_std	caminata	bolsos	caminata grande	alias	100	t	\N	2026-03-10 02:01:09.137162
10	bag_confitero_20x25_full	confitero	bolsos	bolso confitero premium	alias	100	t	\N	2026-03-10 02:01:09.137162
11	bag_confitero_20x25_full	confitero	bolsos	bolso sublimado premium	alias	100	t	\N	2026-03-10 02:01:09.137162
12	bag_confitero_20x25_full	confitero	bolsos	confitero premium	alias	100	t	\N	2026-03-10 02:01:09.137162
13	bag_confitero_20x25_std	confitero	bolsos	bolso confitero	alias	100	t	\N	2026-03-10 02:01:09.137162
14	bag_confitero_20x25_std	confitero	bolsos	candy bag tela	alias	100	t	\N	2026-03-10 02:01:09.137162
15	bag_confitero_20x25_std	confitero	bolsos	confitero	alias	100	t	\N	2026-03-10 02:01:09.137162
16	bag_confitero_20x25_std	confitero	bolsos	saquito confitero	alias	100	t	\N	2026-03-10 02:01:09.137162
17	bag_confitero_30x35_std	confitero	bolsos	confitero grande	alias	100	t	\N	2026-03-10 02:01:09.137162
18	bag_confitero_30x35_std	confitero	bolsos	saquito confitero grande	alias	100	t	\N	2026-03-10 02:01:09.137162
19	bag_tote_20x30_std	tote_bag	bolsos	bolso tote	alias	100	t	\N	2026-03-10 02:01:09.137162
20	bag_tote_20x30_std	tote_bag	bolsos	tote	alias	100	t	\N	2026-03-10 02:01:09.137162
21	bag_tote_20x30_std	tote_bag	bolsos	tote bag	alias	100	t	\N	2026-03-10 02:01:09.137162
22	banner_flags_std	banderines	decoracion	banderines	alias	100	t	\N	2026-03-10 02:01:09.137162
23	banner_flags_std	banderines	decoracion	guirnalda	alias	100	t	\N	2026-03-10 02:01:09.137162
24	book_coloring_std	libro_colorear	coleccion_creativa	cuaderno para colorear	alias	100	t	\N	2026-03-10 02:01:09.137162
25	book_coloring_std	libro_colorear	coleccion_creativa	libro de colorear	alias	100	t	\N	2026-03-10 02:01:09.137162
26	book_coloring_std	libro_colorear	coleccion_creativa	libro para colorear	alias	100	t	\N	2026-03-10 02:01:09.137162
27	candy_box_3d_15_6x7_5x11	candy_box_3d	cajas	caja 3d	alias	100	t	\N	2026-03-10 02:01:09.137162
28	candy_box_3d_15_6x7_5x11	candy_box_3d	cajas	candy box 3d	alias	100	t	\N	2026-03-10 02:01:09.137162
29	candy_box_relieve_15_6x7_5x11	candy_box_relieve	cajas	caja dulce relieve	alias	100	t	\N	2026-03-10 02:01:09.137162
30	candy_box_relieve_15_6x7_5x11	candy_box_relieve	cajas	candy box relieve	alias	100	t	\N	2026-03-10 02:01:09.137162
31	chip_bags_std	chip_bags	complementos	bolsitas de snacks	alias	100	t	\N	2026-03-10 02:01:09.137162
32	chip_bags_std	chip_bags	complementos	bolsitas personalizadas	alias	100	t	\N	2026-03-10 02:01:09.137162
33	chip_bags_std	chip_bags	complementos	chip bags	alias	100	t	\N	2026-03-10 02:01:09.137162
34	clear_bag_22x7x17	clear_bag	bolsos	bolsa pvc	alias	100	t	\N	2026-03-10 02:01:09.137162
35	clear_bag_22x7x17	clear_bag	bolsos	bolsa transparente	alias	100	t	\N	2026-03-10 02:01:09.137162
36	clear_bag_22x7x17	clear_bag	bolsos	clear bag	alias	100	t	\N	2026-03-10 02:01:09.137162
37	cups_vinyl_std	vasos_personalizados	vasos	vasos	alias	100	t	\N	2026-03-10 02:01:09.137162
38	cups_vinyl_std	vasos_personalizados	vasos	vasos en vinil	alias	100	t	\N	2026-03-10 02:01:09.137162
39	cups_vinyl_std	vasos_personalizados	vasos	vasos personalizados	alias	100	t	\N	2026-03-10 02:01:09.137162
40	kit_creativo_std	kit_creativo	kits	combo creativo	alias	100	t	\N	2026-03-10 02:01:09.137162
41	kit_creativo_std	kit_creativo	kits	kit creativo	alias	100	t	\N	2026-03-10 02:01:09.137162
42	kit_creativo_std	kit_creativo	kits	kit personalizado	alias	100	t	\N	2026-03-10 02:01:09.137162
43	party_hats_std	party_hats	complementos	gorritos	alias	100	t	\N	2026-03-10 02:01:09.137162
44	party_hats_std	party_hats	complementos	party hats	alias	100	t	\N	2026-03-10 02:01:09.137162
45	party_hats_std	party_hats	complementos	sombreritos de fiesta	alias	100	t	\N	2026-03-10 02:01:09.137162
46	pillow_coloring_20x20	almohadon_colorear	coleccion_creativa	almohadon para colorear	alias	100	t	\N	2026-03-10 02:01:09.137162
47	pillow_coloring_20x20	almohadon_colorear	coleccion_creativa	cojin para colorear	alias	100	t	\N	2026-03-10 02:01:09.137162
48	shirt_custom_from	camisetas	ropa	camisetas	alias	100	t	\N	2026-03-10 02:01:09.137162
49	shirt_custom_from	camisetas	ropa	camisetas personalizadas	alias	100	t	\N	2026-03-10 02:01:09.137162
50	shirt_custom_from	camisetas	ropa	shirt personalizada	alias	100	t	\N	2026-03-10 02:01:09.137162
51	\N	caminata	bolsos	bolso caminata	alias	100	t	\N	2026-03-10 02:01:27.555185
52	\N	caminata	bolsos	bolso tipo caminata	alias	100	t	\N	2026-03-10 02:01:27.555185
53	\N	caminata	bolsos	bolso de espalda	alias	95	t	\N	2026-03-10 02:01:27.555185
54	\N	caminata	bolsos	backpack	alias	90	t	\N	2026-03-10 02:01:27.555185
55	\N	caminata	bolsos	bolsos tipo backpack	alias	85	t	\N	2026-03-10 02:01:27.555185
56	\N	caminata	bolsos	mochilita	alias	70	t	\N	2026-03-10 02:01:27.555185
57	\N	confitero	bolsos	bolso confitero	alias	100	t	\N	2026-03-10 02:01:35.544967
58	\N	confitero	bolsos	candy bag tela	alias	100	t	\N	2026-03-10 02:01:35.544967
59	\N	confitero	bolsos	saquito confitero	alias	95	t	\N	2026-03-10 02:01:35.544967
60	\N	tote_bag	bolsos	tote bag	alias	100	t	\N	2026-03-10 02:01:45.720436
61	\N	tote_bag	bolsos	bolso tote	alias	100	t	\N	2026-03-10 02:01:45.720436
62	\N	tote_bag	bolsos	tote	alias	90	t	\N	2026-03-10 02:01:45.720436
\.


--
-- Data for Name: mwl_products_old; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."mwl_products_old" ("id", "name", "category", "price_crc", "price_from_crc", "min_qty", "details", "notes", "keywords", "updated_at") FROM stdin;
\.


--
-- Data for Name: mwl_search_feedback; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."mwl_search_feedback" ("id", "searched_text", "searched_text_normalized", "top_result_product_id", "top_result_family", "top_result_category", "match_quality", "score", "was_helpful", "corrected_to_product_id", "corrected_to_family", "corrected_to_category", "source_channel", "notes", "created_at", "lookup_mode", "result_count") FROM stdin;
1	bolsos tipo caminata	bolso tipo caminata	bag_caminata_20x25_std	caminata	bolsos	exact	7.75	\N	\N	\N	\N	tool_catalog_search	\N	2026-03-10 03:33:49.995924	semantic	5
2	individuales	individual	bag_caminata_20x25_std	caminata	bolsos	strong	2.75	\N	\N	\N	\N	tool_catalog_search	\N	2026-03-11 18:20:27.524974	semantic	5
3	bolsos	bolso	bag_confitero_20x25_full	confitero	bolsos	strong	9.7	\N	\N	\N	\N	tool_catalog_search	\N	2026-03-13 14:28:53.972227	semantic	5
4			bag_caminata_20x25_full	caminata	bolsos	exact	999	\N	\N	\N	\N	tool_catalog_search	\N	2026-03-13 14:30:15.271649	exact_product_id	1
5			bag_caminata_20x25_full	caminata	bolsos	exact	999	\N	\N	\N	\N	tool_catalog_search	\N	2026-03-13 14:30:51.15139	exact_product_id	1
6			bag_caminata_20x25_full	caminata	bolsos	exact	999	\N	\N	\N	\N	tool_catalog_search	\N	2026-03-13 14:31:23.656291	exact_product_id	1
7	bolso caminata full sublimada	bolso caminata full sublimada	bag_caminata_20x25_full	caminata	bolsos	strong	3.39	\N	\N	\N	\N	tool_catalog_search	\N	2026-03-13 14:31:58.626201	semantic	5
8			bag_caminata_20x25_full	caminata	bolsos	exact	999	\N	\N	\N	\N	tool_catalog_search	\N	2026-03-13 14:32:06.090199	exact_product_id	1
9			bag_caminata_20x25_full	caminata	bolsos	exact	999	\N	\N	\N	\N	tool_catalog_search	\N	2026-03-13 14:32:31.656506	exact_product_id	1
10			bag_caminata_20x25_full	caminata	bolsos	exact	999	\N	\N	\N	\N	tool_catalog_search	\N	2026-03-13 14:33:05.505234	exact_product_id	1
11	bolsitos	bolsito	bag_caminata_20x25_std	caminata	bolsos	strong	2.924	\N	\N	\N	\N	tool_catalog_search	\N	2026-03-26 03:39:52.259246	semantic	5
12			bag_confitero_20x25_std	confitero	bolsos	exact	999	\N	\N	\N	\N	tool_catalog_search	\N	2026-03-26 03:46:31.067064	exact_product_id	1
13			bag_confitero_20x25_std	confitero	bolsos	exact	999	\N	\N	\N	\N	tool_catalog_search	\N	2026-03-26 03:47:46.655377	exact_product_id	1
14			bag_confitero_20x25_std	confitero	bolsos	exact	999	\N	\N	\N	\N	tool_catalog_search	\N	2026-03-26 04:30:48.720689	exact_product_id	1
15			bag_confitero_20x25_std	confitero	bolsos	exact	999	\N	\N	\N	\N	tool_catalog_search	\N	2026-03-26 04:31:17.916687	exact_product_id	1
16			bag_confitero_20x25_std	confitero	bolsos	exact	999	\N	\N	\N	\N	tool_catalog_search	\N	2026-03-26 04:31:50.719729	exact_product_id	1
17	bolsos	bolso	bag_confitero_20x25_full	confitero	bolsos	strong	9.7	\N	\N	\N	\N	tool_catalog_search	\N	2026-03-28 20:46:41.359456	semantic	5
18	bolsos	bolso	bag_confitero_20x25_full	confitero	bolsos	strong	9.7	\N	\N	\N	\N	tool_catalog_search	\N	2026-03-28 21:06:47.803149	semantic	5
19	bolsos	bolso	bag_confitero_20x25_full	confitero	bolsos	strong	9.7	\N	\N	\N	\N	tool_catalog_search	\N	2026-03-28 21:08:02.804654	semantic	5
20	bolsos	bolso	bag_confitero_20x25_full	confitero	bolsos	strong	9.7	\N	\N	\N	\N	tool_catalog_search	\N	2026-03-28 21:09:29.663628	semantic	5
21			bag_confitero_20x25_full	confitero	bolsos	exact	999	\N	\N	\N	\N	tool_catalog_search	\N	2026-03-28 21:44:09.682137	exact_product_id	1
22			bag_confitero_20x25_full	confitero	bolsos	exact	999	\N	\N	\N	\N	tool_catalog_search	\N	2026-03-28 21:44:44.754593	exact_product_id	1
23	confitero	confitero	bag_confitero_20x25_std	confitero	bolsos	exact	11.65	\N	\N	\N	\N	tool_catalog_search	\N	2026-03-28 22:00:16.786847	semantic	5
24			bag_confitero_20x25_std	confitero	bolsos	exact	999	\N	\N	\N	\N	tool_catalog_search	\N	2026-03-28 22:01:07.724605	exact_product_id	1
25	confitero	confitero	bag_confitero_20x25_std	confitero	bolsos	exact	11.65	\N	\N	\N	\N	tool_catalog_search	\N	2026-03-28 22:02:02.535023	semantic	5
26			bag_caminata_20x25_full	caminata	bolsos	exact	999	\N	\N	\N	\N	tool_catalog_search	\N	2026-03-28 22:06:04.133767	exact_product_id	1
27	bolso caminata premium	bolso caminata premium	bag_caminata_20x25_full	caminata	bolsos	strong	3.55	\N	\N	\N	\N	tool_catalog_search	\N	2026-03-28 22:07:39.154235	semantic	5
28	vasos	vaso	cups_vinyl_std	vasos_personalizados	vasos	exact	10.2	\N	\N	\N	\N	tool_catalog_search	\N	2026-03-31 02:19:05.716396	semantic	5
29			cups_vinyl_std	vasos_personalizados	vasos	exact	999	\N	\N	\N	\N	tool_catalog_search	\N	2026-03-31 02:19:12.553115	exact_product_id	1
30	vasos	vaso	cups_vinyl_std	vasos_personalizados	vasos	exact	10.2	\N	\N	\N	\N	tool_catalog_search	\N	2026-03-31 02:32:34.305772	semantic	5
\.


--
-- Data for Name: mwl_search_synonyms; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."mwl_search_synonyms" ("id", "term", "maps_to", "maps_to_type", "priority", "is_active", "notes", "created_at") FROM stdin;
1	backpack	caminata	family	100	t	equivale a bolso caminata	2026-03-10 02:29:02.670028
2	mochila	caminata	family	95	t	uso coloquial	2026-03-10 02:29:02.670028
3	bolso de espalda	caminata	family	95	t	uso coloquial	2026-03-10 02:29:02.670028
4	vasito	vasos	category	90	t	diminutivo común	2026-03-10 02:29:02.670028
5	vacito	vasos	category	85	t	error ortográfico común	2026-03-10 02:29:02.670028
6	bolsitos	confitero	family	80	t	uso coloquial frecuente	2026-03-10 02:29:02.670028
7	backpack	caminata	family	100	t	equivale a bolso caminata	2026-03-10 02:44:23.3778
8	mochila	caminata	family	95	t	uso coloquial	2026-03-10 02:44:23.3778
9	bolso de espalda	caminata	family	95	t	uso coloquial	2026-03-10 02:44:23.3778
10	bolso backpack	caminata	family	95	t	variación comercial	2026-03-10 02:44:23.3778
11	mochilita	caminata	family	80	t	diminutivo posible	2026-03-10 02:44:23.3778
12	bolsito	confitero	family	90	t	uso coloquial frecuente	2026-03-10 02:44:23.3778
13	bolsitos	confitero	family	90	t	plural frecuente	2026-03-10 02:44:23.3778
14	saquito	confitero	family	85	t	uso coloquial	2026-03-10 02:44:23.3778
15	bolsa para dulces	confitero	family	90	t	intención frecuente	2026-03-10 02:44:23.3778
16	bolsita para dulces	confitero	family	90	t	variación frecuente	2026-03-10 02:44:23.3778
17	candy bag	confitero	family	85	t	anglicismo comercial	2026-03-10 02:44:23.3778
18	tote	tote_bag	family	100	t	abreviación común	2026-03-10 02:44:23.3778
19	bolso tote	tote_bag	family	100	t	uso común	2026-03-10 02:44:23.3778
20	shopping bag	tote_bag	family	75	t	equivalente comercial	2026-03-10 02:44:23.3778
21	vasito	vasos	category	95	t	diminutivo frecuente	2026-03-10 02:44:23.3778
22	vasitos	vasos	category	95	t	plural frecuente	2026-03-10 02:44:23.3778
23	vacito	vasos	category	85	t	error ortográfico frecuente	2026-03-10 02:44:23.3778
24	vacitos	vasos	category	85	t	error ortográfico frecuente plural	2026-03-10 02:44:23.3778
25	guirnalda	banderines	family	80	t	sinónimo cercano	2026-03-10 02:44:23.3778
26	banderín	banderines	family	90	t	singular frecuente	2026-03-10 02:44:23.3778
27	cuaderno para colorear	libro_colorear	family	95	t	forma alternativa	2026-03-10 02:44:23.3778
28	librito para colorear	libro_colorear	family	85	t	diminutivo posible	2026-03-10 02:44:23.3778
29	cojin para colorear	almohadon_colorear	family	90	t	sin tilde usual	2026-03-10 02:44:23.3778
30	almohadita para colorear	almohadon_colorear	family	75	t	diminutivo posible	2026-03-10 02:44:23.3778
31	shirt	camisetas	family	80	t	anglicismo común	2026-03-10 02:44:23.3778
32	camisa personalizada	camisetas	family	70	t	consulta genérica	2026-03-10 02:44:23.3778
33	caja para dulces	cajas	category	85	t	consulta genérica	2026-03-10 02:44:23.3778
34	cajita de dulces	cajas	category	85	t	diminutivo frecuente	2026-03-10 02:44:23.3778
\.


--
-- Data for Name: n8n_chat_histories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."n8n_chat_histories" ("id", "session_id", "message") FROM stdin;
731	+50688928728	{"type": "human", "content": "{\\"mensaje\\":\\"buenas tardes quiero informacion de bolsos\\",\\"ChatID\\":\\"+50688928728\\",\\"NombreCliente\\":\\"Carlos Mata\\",\\"lead_thread_key\\":\\"+50688928728\\",\\"lead_thread_id\\":\\"68f01174-621c-4a28-9401-98e1e14b631a\\",\\"channel\\":\\"whatsapp\\",\\"provider\\":\\"ycloud\\",\\"external_message_id\\":\\"69c84381998c0e7158529a73\\",\\"lead_stage\\":\\"new\\",\\"created_contact\\":\\"false\\",\\"created_lead_thread\\":\\"false\\"}", "additional_kwargs": {}, "response_metadata": {}}
732	+50688928728	{"type": "ai", "content": "Calling Call_TOOL_-_catalog_search with input: {\\"query\\":\\"bolsos\\",\\"limit\\":\\"5\\",\\"max_price_crc\\":\\"\\",\\"min_qty\\":\\"\\",\\"category\\":\\"\\",\\"id\\":\\"call_eAKaLbSneQiYzzIBjW2lOlJm\\"}", "tool_calls": [{"id": "call_eAKaLbSneQiYzzIBjW2lOlJm", "args": {"id": "call_eAKaLbSneQiYzzIBjW2lOlJm", "limit": "5", "query": "bolsos", "min_qty": "", "category": "", "max_price_crc": ""}, "name": "Call_TOOL_-_catalog_search", "type": "tool_call"}], "additional_kwargs": {}, "response_metadata": {}, "invalid_tool_calls": []}
733	+50688928728	{"name": "Call_TOOL_-_catalog_search", "type": "tool", "content": "[{\\"found\\":true,\\"lookup_mode\\":\\"semantic\\",\\"exact_product_id\\":null,\\"result_count\\":5,\\"best_match_quality\\":\\"strong\\",\\"results\\":[{\\"id\\":\\"bag_confitero_20x25_full\\",\\"sku\\":\\"MWL-BAG-CONF-20X25-FULL\\",\\"name\\":\\"Bolso tipo confitero premium 20x25 cm\\",\\"category\\":\\"bolsos\\",\\"family\\":\\"confitero\\",\\"variant_label\\":\\"premium\\",\\"size_label\\":\\"20x25 cm\\",\\"price_crc\\":1600,\\"price_from_crc\\":null,\\"min_qty\\":12,\\"summary\\":\\"Bolso confitero premium totalmente sublimado.\\",\\"details\\":\\"Tela trasera de color.\\",\\"notes\\":null,\\"aliases\\":[\\"bolso confitero\\",\\"bolso confitero premium\\",\\"bolso sublimado premium\\",\\"candy bag tela\\",\\"confitero premium\\",\\"saquito confitero\\"],\\"source_type\\":\\"catalog_pdf\\",\\"source_ref\\":\\"Fiestas2026.pdf\\",\\"image\\":null,\\"exact_match\\":false,\\"direct_match\\":true,\\"match_quality\\":\\"strong\\",\\"score\\":9.7},{\\"id\\":\\"bag_caminata_20x25_std\\",\\"sku\\":\\"MWL-BAG-CAM-20X25-STD\\",\\"name\\":\\"Caminata 20x25 cm Fondo Blanco\\",\\"category\\":\\"bolsos\\",\\"family\\":\\"caminata\\",\\"variant_label\\":\\"estandar\\",\\"size_label\\":\\"20x25 cm\\",\\"price_crc\\":1700,\\"price_from_crc\\":null,\\"min_qty\\":5,\\"summary\\":\\"Bolso tipo caminata en tela blanca.\\",\\"details\\":\\"Personalización temática frontal.\\",\\"notes\\":\\"Se puede incluir nombre del invitado sin costo adicional.\\",\\"aliases\\":[\\"bolso caminata\\",\\"bolso tipo caminata\\",\\"caminata\\",\\"bolso de espalda\\",\\"backpack\\",\\"bolsos tipo backpack\\",\\"mochilita\\"],\\"source_type\\":\\"owner_direct\\",\\"source_ref\\":\\"Actualizacion manual bolsos marzo 2026\\",\\"image\\":null,\\"exact_match\\":false,\\"direct_match\\":true,\\"match_quality\\":\\"strong\\",\\"score\\":7.77},{\\"id\\":\\"bag_caminata_20x25_full\\",\\"sku\\":\\"MWL-BAG-CAM-20X25-FULL\\",\\"name\\":\\"Caminata 20x25 cm Full Sublimada\\",\\"category\\":\\"bolsos\\",\\"family\\":\\"caminata\\",\\"variant_label\\":\\"premium\\",\\"size_label\\":\\"20x25 cm\\",\\"price_crc\\":2500,\\"price_from_crc\\":null,\\"min_qty\\":5,\\"summary\\":\\"Bolso tipo caminata completamente sublimado.\\",\\"details\\":\\"Parte trasera puede ser de color. Es la unica opcion totalmente colorida.\\",\\"notes\\":\\"Tiene descuento del 5% solo en pedidos mayores a 15 unidades. El agente no debe ofrecerlo si el cliente no lo pide.\\",\\"aliases\\":[\\"bolso caminata\\",\\"bolso premium caminata\\",\\"bolso tipo caminata\\",\\"caminata colorida\\",\\"caminata full sublimada\\",\\"caminata premium\\",\\"bolso de espalda\\",\\"backpack\\",\\"bolsos tipo backpack\\",\\"mochilita\\"],\\"source_type\\":\\"owner_direct\\",\\"source_ref\\":\\"Actualizacion manual bolsos marzo 2026\\",\\"image\\":{\\"bucket\\":\\"mwl-products\\",\\"path\\":\\"products/bag_caminata_20x25_full/main.jpeg\\",\\"alt_text\\":\\"Bolso tipo caminata 20x25 cm full sublimado\\"},\\"exact_match\\":false,\\"direct_match\\":true,\\"match_quality\\":\\"strong\\",\\"score\\":7.77},{\\"id\\":\\"bag_caminata_30x35_std\\",\\"sku\\":\\"MWL-BAG-CAM-30X35-STD\\",\\"name\\":\\"Caminata 30x35 cm Fondo Blanco\\",\\"category\\":\\"bolsos\\",\\"family\\":\\"caminata\\",\\"variant_label\\":\\"estandar\\",\\"size_label\\":\\"30x35 cm\\",\\"price_crc\\":1900,\\"price_from_crc\\":null,\\"min_qty\\":5,\\"summary\\":\\"Bolso tipo caminata en tela blanca.\\",\\"details\\":\\"Diseño frontal temático.\\",\\"notes\\":\\"Se puede incluir nombre sin costo adicional.\\",\\"aliases\\":[\\"bolso caminata\\",\\"bolso caminata grande\\",\\"bolso tipo caminata\\",\\"caminata grande\\",\\"bolso de espalda\\",\\"backpack\\",\\"bolsos tipo backpack\\",\\"mochilita\\"],\\"source_type\\":\\"owner_direct\\",\\"source_ref\\":\\"Actualizacion manual bolsos marzo 2026\\",\\"image\\":null,\\"exact_match\\":false,\\"direct_match\\":true,\\"match_quality\\":\\"strong\\",\\"score\\":7.52},{\\"id\\":\\"bag_confitero_20x25_std\\",\\"sku\\":\\"MWL-BAG-CONF-20X25-STD\\",\\"name\\":\\"Confitero 20x25 cm\\",\\"category\\":\\"bolsos\\",\\"family\\":\\"confitero\\",\\"variant_label\\":\\"estandar\\",\\"size_label\\":\\"20x25 cm\\",\\"price_crc\\":1000,\\"price_from_crc\\":null,\\"min_qty\\":5,\\"summary\\":\\"Bolso confitero en tela blanca.\\",\\"details\\":\\"Personalización temática frontal.\\",\\"notes\\":\\"Se puede incluir nombre del invitado sin costo adicional.\\",\\"aliases\\":[\\"bolso confitero\\",\\"candy bag tela\\",\\"confitero\\",\\"saquito confitero\\"],\\"source_type\\":\\"owner_direct\\",\\"source_ref\\":\\"Actualizacion manual bolsos marzo 2026\\",\\"image\\":{\\"bucket\\":\\"mwl-products\\",\\"path\\":\\"products/bag_confitero_20x25_std/main.jpeg\\",\\"alt_text\\":\\"Bolso tipo caminata 20x25 cm standard\\"},\\"exact_match\\":false,\\"direct_match\\":true,\\"match_quality\\":\\"strong\\",\\"score\\":7.25}],\\"source\\":[\\"Fiestas2026.pdf\\",\\"Actualizacion manual bolsos marzo 2026\\"],\\"notes\\":null,\\"confidence\\":0.88}]", "tool_call_id": "call_eAKaLbSneQiYzzIBjW2lOlJm", "additional_kwargs": {}, "response_metadata": {}}
734	+50688928728	{"type": "ai", "content": "{\\n  \\"reply_text\\": \\"Hola 😊 tenemos estos bolsos:\\\\nConfitero premium 20x25 cm ₡1600 (mínimo 12),\\\\nCaminata 20x25 cm estándar ₡1700 (mínimo 5),\\\\nCaminata 20x25 cm full sublimada ₡2500 (mínimo 5),\\\\nCaminata 30x35 cm estándar ₡1900 (mínimo 5),\\\\nConfitero 20x25 cm estándar ₡1000 (mínimo 5).\\\\n¿Cuál te interesa?\\",\\n  \\"intent\\": \\"inquiry\\",\\n  \\"stage\\": \\"discovery\\",\\n  \\"confidence\\": 0.88,\\n  \\"risk_flag\\": false,\\n  \\"needs_human\\": false,\\n  \\"human_handoff\\": null,\\n  \\"actions\\": [],\\n  \\"selected_catalog_image_ref\\": null\\n}", "tool_calls": [], "additional_kwargs": {}, "response_metadata": {}, "invalid_tool_calls": []}
741	+50688928728	{"type": "human", "content": "{\\"mensaje\\":\\"Tienes alguna imagen?\\",\\"ChatID\\":\\"+50688928728\\",\\"NombreCliente\\":\\"Carlos Mata\\",\\"lead_thread_key\\":\\"+50688928728\\",\\"lead_thread_id\\":\\"68f01174-621c-4a28-9401-98e1e14b631a\\",\\"channel\\":\\"whatsapp\\",\\"provider\\":\\"ycloud\\",\\"external_message_id\\":\\"69c84bbc998c0e71585413ac\\",\\"lead_stage\\":\\"new\\",\\"created_contact\\":\\"false\\",\\"created_lead_thread\\":\\"false\\"}", "additional_kwargs": {}, "response_metadata": {}}
742	+50688928728	{"type": "ai", "content": "{\\n  \\"reply_text\\": \\"Sí, aquí te envío una imagen del bolso confitero premium 20x25 cm para que lo veas.\\",\\n  \\"intent\\": \\"purchase\\",\\n  \\"stage\\": \\"qualification\\",\\n  \\"confidence\\": 0.95,\\n  \\"risk_flag\\": false,\\n  \\"needs_human\\": false,\\n  \\"human_handoff\\": null,\\n  \\"actions\\": [],\\n  \\"selected_catalog_image_ref\\": \\"bag_confitero_20x25_full\\"\\n}", "tool_calls": [], "additional_kwargs": {}, "response_metadata": {}, "invalid_tool_calls": []}
754	+50688928728	{"type": "ai", "content": "{\\n  \\"reply_text\\": \\"Para 15 confiteros estándar 20x25 cm, el precio es ₡15,000 (₡1000 cada uno). ¿Querés que te prepare la cotización formal o querés agregar la temática y fecha del evento?\\",\\n  \\"intent\\": \\"offer\\",\\n  \\"stage\\": \\"offer\\",\\n  \\"confidence\\": 0.96,\\n  \\"risk_flag\\": false,\\n  \\"needs_human\\": false,\\n  \\"human_handoff\\": null,\\n  \\"actions\\": [],\\n  \\"selected_catalog_image_ref\\": null\\n}", "tool_calls": [], "additional_kwargs": {}, "response_metadata": {}, "invalid_tool_calls": []}
763	+50688928728	{"type": "human", "content": "{\\"mensaje\\":\\"y ese que valor tiene?\\",\\"ChatID\\":\\"+50688928728\\",\\"NombreCliente\\":\\"Carlos Mata\\",\\"lead_thread_key\\":\\"+50688928728\\",\\"lead_thread_id\\":\\"68f01174-621c-4a28-9401-98e1e14b631a\\",\\"channel\\":\\"whatsapp\\",\\"provider\\":\\"ycloud\\",\\"external_message_id\\":\\"69c850db998c0e715854eac1\\",\\"lead_stage\\":\\"new\\",\\"created_contact\\":\\"false\\",\\"created_lead_thread\\":\\"false\\"}", "additional_kwargs": {}, "response_metadata": {}}
764	+50688928728	{"type": "ai", "content": "{\\n  \\"reply_text\\": \\"El bolso caminata premium cuesta ₡2500 por unidad. ¿Cuántos necesitás para la fiesta?\\",\\n  \\"intent\\": \\"offer\\",\\n  \\"stage\\": \\"offer\\",\\n  \\"confidence\\": 0.95,\\n  \\"risk_flag\\": false,\\n  \\"needs_human\\": false,\\n  \\"human_handoff\\": null,\\n  \\"actions\\": [],\\n  \\"selected_catalog_image_ref\\": null\\n}", "tool_calls": [], "additional_kwargs": {}, "response_metadata": {}, "invalid_tool_calls": []}
769	+50688928728	{"name": "Call_TOOL_-_catalog_search", "type": "tool", "content": "[{\\"found\\":true,\\"lookup_mode\\":\\"semantic\\",\\"exact_product_id\\":null,\\"result_count\\":5,\\"best_match_quality\\":\\"strong\\",\\"results\\":[{\\"id\\":\\"bag_caminata_20x25_full\\",\\"sku\\":\\"MWL-BAG-CAM-20X25-FULL\\",\\"name\\":\\"Caminata 20x25 cm Full Sublimada\\",\\"category\\":\\"bolsos\\",\\"family\\":\\"caminata\\",\\"variant_label\\":\\"premium\\",\\"size_label\\":\\"20x25 cm\\",\\"price_crc\\":2500,\\"price_from_crc\\":null,\\"min_qty\\":5,\\"summary\\":\\"Bolso tipo caminata completamente sublimado.\\",\\"details\\":\\"Parte trasera puede ser de color. Es la unica opcion totalmente colorida.\\",\\"notes\\":\\"Tiene descuento del 5% solo en pedidos mayores a 15 unidades. El agente no debe ofrecerlo si el cliente no lo pide.\\",\\"aliases\\":[\\"bolso caminata\\",\\"bolso premium caminata\\",\\"bolso tipo caminata\\",\\"caminata colorida\\",\\"caminata full sublimada\\",\\"caminata premium\\",\\"bolso de espalda\\",\\"backpack\\",\\"bolsos tipo backpack\\",\\"mochilita\\"],\\"source_type\\":\\"owner_direct\\",\\"source_ref\\":\\"Actualizacion manual bolsos marzo 2026\\",\\"image\\":{\\"bucket\\":\\"mwl-products\\",\\"path\\":\\"products/bag_caminata_20x25_full/main.jpeg\\",\\"alt_text\\":\\"Bolso tipo caminata 20x25 cm full sublimado\\"},\\"exact_match\\":false,\\"direct_match\\":false,\\"match_quality\\":\\"strong\\",\\"score\\":3.55},{\\"id\\":\\"bag_caminata_20x25_std\\",\\"sku\\":\\"MWL-BAG-CAM-20X25-STD\\",\\"name\\":\\"Caminata 20x25 cm Fondo Blanco\\",\\"category\\":\\"bolsos\\",\\"family\\":\\"caminata\\",\\"variant_label\\":\\"estandar\\",\\"size_label\\":\\"20x25 cm\\",\\"price_crc\\":1700,\\"price_from_crc\\":null,\\"min_qty\\":5,\\"summary\\":\\"Bolso tipo caminata en tela blanca.\\",\\"details\\":\\"Personalización temática frontal.\\",\\"notes\\":\\"Se puede incluir nombre del invitado sin costo adicional.\\",\\"aliases\\":[\\"bolso caminata\\",\\"bolso tipo caminata\\",\\"caminata\\",\\"bolso de espalda\\",\\"backpack\\",\\"bolsos tipo backpack\\",\\"mochilita\\"],\\"source_type\\":\\"owner_direct\\",\\"source_ref\\":\\"Actualizacion manual bolsos marzo 2026\\",\\"image\\":null,\\"exact_match\\":false,\\"direct_match\\":false,\\"match_quality\\":\\"strong\\",\\"score\\":3.272},{\\"id\\":\\"bag_caminata_30x35_std\\",\\"sku\\":\\"MWL-BAG-CAM-30X35-STD\\",\\"name\\":\\"Caminata 30x35 cm Fondo Blanco\\",\\"category\\":\\"bolsos\\",\\"family\\":\\"caminata\\",\\"variant_label\\":\\"estandar\\",\\"size_label\\":\\"30x35 cm\\",\\"price_crc\\":1900,\\"price_from_crc\\":null,\\"min_qty\\":5,\\"summary\\":\\"Bolso tipo caminata en tela blanca.\\",\\"details\\":\\"Diseño frontal temático.\\",\\"notes\\":\\"Se puede incluir nombre sin costo adicional.\\",\\"aliases\\":[\\"bolso caminata\\",\\"bolso caminata grande\\",\\"bolso tipo caminata\\",\\"caminata grande\\",\\"bolso de espalda\\",\\"backpack\\",\\"bolsos tipo backpack\\",\\"mochilita\\"],\\"source_type\\":\\"owner_direct\\",\\"source_ref\\":\\"Actualizacion manual bolsos marzo 2026\\",\\"image\\":null,\\"exact_match\\":false,\\"direct_match\\":false,\\"match_quality\\":\\"strong\\",\\"score\\":3.022},{\\"id\\":\\"bag_confitero_20x25_full\\",\\"sku\\":\\"MWL-BAG-CONF-20X25-FULL\\",\\"name\\":\\"Bolso tipo confitero premium 20x25 cm\\",\\"category\\":\\"bolsos\\",\\"family\\":\\"confitero\\",\\"variant_label\\":\\"premium\\",\\"size_label\\":\\"20x25 cm\\",\\"price_crc\\":1600,\\"price_from_crc\\":null,\\"min_qty\\":12,\\"summary\\":\\"Bolso confitero premium totalmente sublimado.\\",\\"details\\":\\"Tela trasera de color.\\",\\"notes\\":null,\\"aliases\\":[\\"bolso confitero\\",\\"bolso confitero premium\\",\\"bolso sublimado premium\\",\\"candy bag tela\\",\\"confitero premium\\",\\"saquito confitero\\"],\\"source_type\\":\\"catalog_pdf\\",\\"source_ref\\":\\"Fiestas2026.pdf\\",\\"image\\":null,\\"exact_match\\":false,\\"direct_match\\":false,\\"match_quality\\":\\"strong\\",\\"score\\":2.875},{\\"id\\":\\"bag_confitero_20x25_std\\",\\"sku\\":\\"MWL-BAG-CONF-20X25-STD\\",\\"name\\":\\"Confitero 20x25 cm\\",\\"category\\":\\"bolsos\\",\\"family\\":\\"confitero\\",\\"variant_label\\":\\"estandar\\",\\"size_label\\":\\"20x25 cm\\",\\"price_crc\\":1000,\\"price_from_crc\\":null,\\"min_qty\\":5,\\"summary\\":\\"Bolso confitero en tela blanca.\\",\\"details\\":\\"Personalización temática frontal.\\",\\"notes\\":\\"Se puede incluir nombre del invitado sin costo adicional.\\",\\"aliases\\":[\\"bolso confitero\\",\\"candy bag tela\\",\\"confitero\\",\\"saquito confitero\\"],\\"source_type\\":\\"owner_direct\\",\\"source_ref\\":\\"Actualizacion manual bolsos marzo 2026\\",\\"image\\":{\\"bucket\\":\\"mwl-products\\",\\"path\\":\\"products/bag_confitero_20x25_std/main.jpeg\\",\\"alt_text\\":\\"Bolso tipo caminata 20x25 cm standard\\"},\\"exact_match\\":false,\\"direct_match\\":false,\\"match_quality\\":\\"strong\\",\\"score\\":2.425}],\\"source\\":[\\"Actualizacion manual bolsos marzo 2026\\",\\"Fiestas2026.pdf\\"],\\"notes\\":null,\\"confidence\\":0.88}]", "tool_call_id": "call_QjQ8edq87EiMUCBaTXDYDelS", "additional_kwargs": {}, "response_metadata": {}}
770	+50688928728	{"type": "ai", "content": "{\\n  \\"reply_text\\": \\"Para 30 unidades del bolso caminata premium, el precio es ₡2500 cada uno. ¿Querés que te prepare la cotización formal?\\",\\n  \\"intent\\": \\"offer\\",\\n  \\"stage\\": \\"offer\\",\\n  \\"confidence\\": 0.95,\\n  \\"risk_flag\\": false,\\n  \\"needs_human\\": false,\\n  \\"human_handoff\\": null,\\n  \\"actions\\": [],\\n  \\"selected_catalog_image_ref\\": null\\n}", "tool_calls": [], "additional_kwargs": {}, "response_metadata": {}, "invalid_tool_calls": []}
735	+50688928728	{"type": "human", "content": "{\\"mensaje\\":\\"buenas tardes quiero informacion de bolsos\\",\\"ChatID\\":\\"+50688928728\\",\\"NombreCliente\\":\\"Carlos Mata\\",\\"lead_thread_key\\":\\"+50688928728\\",\\"lead_thread_id\\":\\"68f01174-621c-4a28-9401-98e1e14b631a\\",\\"channel\\":\\"whatsapp\\",\\"provider\\":\\"ycloud\\",\\"external_message_id\\":\\"69c84526998c0e715852df82\\",\\"lead_stage\\":\\"new\\",\\"created_contact\\":\\"false\\",\\"created_lead_thread\\":\\"false\\"}", "additional_kwargs": {}, "response_metadata": {}}
736	+50688928728	{"type": "ai", "content": "{\\n  \\"reply_text\\": \\"Hola 😊 tenemos estos bolsos:\\\\nConfitero premium 20x25 cm ₡1600 (mínimo 12),\\\\nCaminata 20x25 cm estándar ₡1700 (mínimo 5),\\\\nCaminata 20x25 cm full sublimada ₡2500 (mínimo 5),\\\\nCaminata 30x35 cm estándar ₡1900 (mínimo 5),\\\\nConfitero 20x25 cm estándar ₡1000 (mínimo 5).\\\\n¿Cuál te interesa?\\",\\n  \\"intent\\": \\"inquiry\\",\\n  \\"stage\\": \\"discovery\\",\\n  \\"confidence\\": 0.88,\\n  \\"risk_flag\\": false,\\n  \\"needs_human\\": false,\\n  \\"human_handoff\\": null,\\n  \\"actions\\": [],\\n  \\"selected_catalog_image_ref\\": null\\n}", "tool_calls": [], "additional_kwargs": {}, "response_metadata": {}, "invalid_tool_calls": []}
743	+50688928728	{"type": "human", "content": "{\\"mensaje\\":\\"y cual es la diferencia con el confitero estandar?\\",\\"ChatID\\":\\"+50688928728\\",\\"NombreCliente\\":\\"Carlos Mata\\",\\"lead_thread_key\\":\\"+50688928728\\",\\"lead_thread_id\\":\\"68f01174-621c-4a28-9401-98e1e14b631a\\",\\"channel\\":\\"whatsapp\\",\\"provider\\":\\"ycloud\\",\\"external_message_id\\":\\"69c84f683a48151462292868\\",\\"lead_stage\\":\\"new\\",\\"created_contact\\":\\"false\\",\\"created_lead_thread\\":\\"false\\"}", "additional_kwargs": {}, "response_metadata": {}}
744	+50688928728	{"type": "ai", "content": "Calling Call_TOOL_-_catalog_search with input: {\\"query\\":\\"confitero\\",\\"limit\\":\\"5\\",\\"max_price_crc\\":\\"\\",\\"min_qty\\":\\"\\",\\"category\\":\\"\\",\\"id\\":\\"call_UVtmd6dmbWsUlA1XRo5pIPT8\\"}", "tool_calls": [{"id": "call_UVtmd6dmbWsUlA1XRo5pIPT8", "args": {"id": "call_UVtmd6dmbWsUlA1XRo5pIPT8", "limit": "5", "query": "confitero", "min_qty": "", "category": "", "max_price_crc": ""}, "name": "Call_TOOL_-_catalog_search", "type": "tool_call"}], "additional_kwargs": {}, "response_metadata": {}, "invalid_tool_calls": []}
745	+50688928728	{"name": "Call_TOOL_-_catalog_search", "type": "tool", "content": "[{\\"found\\":true,\\"lookup_mode\\":\\"semantic\\",\\"exact_product_id\\":null,\\"result_count\\":5,\\"best_match_quality\\":\\"exact\\",\\"results\\":[{\\"id\\":\\"bag_confitero_20x25_std\\",\\"sku\\":\\"MWL-BAG-CONF-20X25-STD\\",\\"name\\":\\"Confitero 20x25 cm\\",\\"category\\":\\"bolsos\\",\\"family\\":\\"confitero\\",\\"variant_label\\":\\"estandar\\",\\"size_label\\":\\"20x25 cm\\",\\"price_crc\\":1000,\\"price_from_crc\\":null,\\"min_qty\\":5,\\"summary\\":\\"Bolso confitero en tela blanca.\\",\\"details\\":\\"Personalización temática frontal.\\",\\"notes\\":\\"Se puede incluir nombre del invitado sin costo adicional.\\",\\"aliases\\":[\\"bolso confitero\\",\\"candy bag tela\\",\\"confitero\\",\\"saquito confitero\\"],\\"source_type\\":\\"owner_direct\\",\\"source_ref\\":\\"Actualizacion manual bolsos marzo 2026\\",\\"image\\":{\\"bucket\\":\\"mwl-products\\",\\"path\\":\\"products/bag_confitero_20x25_std/main.jpeg\\",\\"alt_text\\":\\"Bolso tipo caminata 20x25 cm standard\\"},\\"exact_match\\":true,\\"direct_match\\":true,\\"match_quality\\":\\"exact\\",\\"score\\":11.65},{\\"id\\":\\"bag_confitero_20x25_full\\",\\"sku\\":\\"MWL-BAG-CONF-20X25-FULL\\",\\"name\\":\\"Bolso tipo confitero premium 20x25 cm\\",\\"category\\":\\"bolsos\\",\\"family\\":\\"confitero\\",\\"variant_label\\":\\"premium\\",\\"size_label\\":\\"20x25 cm\\",\\"price_crc\\":1600,\\"price_from_crc\\":null,\\"min_qty\\":12,\\"summary\\":\\"Bolso confitero premium totalmente sublimado.\\",\\"details\\":\\"Tela trasera de color.\\",\\"notes\\":null,\\"aliases\\":[\\"bolso confitero\\",\\"bolso confitero premium\\",\\"bolso sublimado premium\\",\\"candy bag tela\\",\\"confitero premium\\",\\"saquito confitero\\"],\\"source_type\\":\\"catalog_pdf\\",\\"source_ref\\":\\"Fiestas2026.pdf\\",\\"image\\":null,\\"exact_match\\":false,\\"direct_match\\":true,\\"match_quality\\":\\"strong\\",\\"score\\":10.9},{\\"id\\":\\"bag_confitero_30x35_std\\",\\"sku\\":\\"MWL-BAG-CONF-30X35-STD\\",\\"name\\":\\"Confitero 30x35 cm\\",\\"category\\":\\"bolsos\\",\\"family\\":\\"confitero\\",\\"variant_label\\":\\"estandar\\",\\"size_label\\":\\"30x35 cm\\",\\"price_crc\\":1300,\\"price_from_crc\\":null,\\"min_qty\\":5,\\"summary\\":\\"Bolso confitero en tela blanca.\\",\\"details\\":\\"Personalización temática frontal.\\",\\"notes\\":\\"Se puede incluir nombre del invitado sin costo adicional.\\",\\"aliases\\":[\\"bolso confitero\\",\\"candy bag tela\\",\\"confitero grande\\",\\"saquito confitero grande\\",\\"saquito confitero\\"],\\"source_type\\":\\"owner_direct\\",\\"source_ref\\":\\"Actualizacion manual bolsos marzo 2026\\",\\"image\\":null,\\"exact_match\\":false,\\"direct_match\\":true,\\"match_quality\\":\\"strong\\",\\"score\\":10.65},{\\"id\\":\\"kit_creativo_std\\",\\"sku\\":\\"MWL-KIT-CREATIVO-STD\\",\\"name\\":\\"Kit creativo personalizado\\",\\"category\\":\\"kits\\",\\"family\\":\\"kit_creativo\\",\\"variant_label\\":\\"estandar\\",\\"size_label\\":null,\\"price_crc\\":null,\\"price_from_crc\\":4500,\\"min_qty\\":10,\\"summary\\":\\"Kit personalizado para celebraciones.\\",\\"details\\":\\"Incluye libro de colorear, vaso personalizado, bolso confitero y crayolas.\\",\\"notes\\":null,\\"aliases\\":[\\"combo creativo\\",\\"kit creativo\\",\\"kit personalizado\\"],\\"source_type\\":\\"catalog_pdf\\",\\"source_ref\\":\\"Fiestas2026.pdf\\",\\"image\\":null,\\"exact_match\\":false,\\"direct_match\\":true,\\"match_quality\\":\\"strong\\",\\"score\\":2.473},{\\"id\\":\\"bag_caminata_20x25_full\\",\\"sku\\":\\"MWL-BAG-CAM-20X25-FULL\\",\\"name\\":\\"Caminata 20x25 cm Full Sublimada\\",\\"category\\":\\"bolsos\\",\\"family\\":\\"caminata\\",\\"variant_label\\":\\"premium\\",\\"size_label\\":\\"20x25 cm\\",\\"price_crc\\":2500,\\"price_from_crc\\":null,\\"min_qty\\":5,\\"summary\\":\\"Bolso tipo caminata completamente sublimado.\\",\\"details\\":\\"Parte trasera puede ser de color. Es la unica opcion totalmente colorida.\\",\\"notes\\":\\"Tiene descuento del 5% solo en pedidos mayores a 15 unidades. El agente no debe ofrecerlo si el cliente no lo pide.\\",\\"aliases\\":[\\"bolso caminata\\",\\"bolso premium caminata\\",\\"bolso tipo caminata\\",\\"caminata colorida\\",\\"caminata full sublimada\\",\\"caminata premium\\",\\"bolso de espalda\\",\\"backpack\\",\\"bolsos tipo backpack\\",\\"mochilita\\"],\\"source_type\\":\\"owner_direct\\",\\"source_ref\\":\\"Actualizacion manual bolsos marzo 2026\\",\\"image\\":{\\"bucket\\":\\"mwl-products\\",\\"path\\":\\"products/bag_caminata_20x25_full/main.jpeg\\",\\"alt_text\\":\\"Bolso tipo caminata 20x25 cm full sublimado\\"},\\"exact_match\\":false,\\"direct_match\\":false,\\"match_quality\\":\\"strong\\",\\"score\\":2.814}],\\"source\\":[\\"Actualizacion manual bolsos marzo 2026\\",\\"Fiestas2026.pdf\\"],\\"notes\\":null,\\"confidence\\":0.96}]", "tool_call_id": "call_UVtmd6dmbWsUlA1XRo5pIPT8", "additional_kwargs": {}, "response_metadata": {}}
746	+50688928728	{"type": "ai", "content": "{\\n  \\"reply_text\\": \\"El confitero estándar es un bolso en tela blanca con personalización temática frontal y mínimo 5 unidades, cuesta ₡1000. El premium es totalmente sublimado, con tela trasera de color y mínimo 12 unidades, cuesta ₡1600. ¿Querés cotizar alguno?\\",\\n  \\"intent\\": \\"inquiry\\",\\n  \\"stage\\": \\"qualification\\",\\n  \\"confidence\\": 0.96,\\n  \\"risk_flag\\": false,\\n  \\"needs_human\\": false,\\n  \\"human_handoff\\": null,\\n  \\"actions\\": [],\\n  \\"selected_catalog_image_ref\\": null\\n}", "tool_calls": [], "additional_kwargs": {}, "response_metadata": {}, "invalid_tool_calls": []}
755	+50688928728	{"type": "human", "content": "{\\"mensaje\\":\\"los quiero de batman para el 20 de abril\\",\\"ChatID\\":\\"+50688928728\\",\\"NombreCliente\\":\\"Carlos Mata\\",\\"lead_thread_key\\":\\"+50688928728\\",\\"lead_thread_id\\":\\"68f01174-621c-4a28-9401-98e1e14b631a\\",\\"channel\\":\\"whatsapp\\",\\"provider\\":\\"ycloud\\",\\"external_message_id\\":\\"69c850115eaa0e49ca039bfe\\",\\"lead_stage\\":\\"new\\",\\"created_contact\\":\\"false\\",\\"created_lead_thread\\":\\"false\\"}", "additional_kwargs": {}, "response_metadata": {}}
756	+50688928728	{"type": "ai", "content": "Calling Call_TOOL_-_sales_upsert_order_context_ with input: {\\"operation\\":\\"upsert_order_context\\",\\"lead_thread_id\\":\\"68f01174-621c-4a28-9401-98e1e14b631a\\",\\"currency\\":\\"CRC\\",\\"source\\":\\"nova\\",\\"notes\\":\\"\\",\\"product_id\\":\\"bag_confitero_20x25_std\\",\\"product_name_snapshot\\":\\"Confitero 20x25 cm\\",\\"sku_snapshot\\":\\"MWL-BAG-CONF-20X25-STD\\",\\"quantity\\":\\"15\\",\\"unit_price_crc\\":\\"1000\\",\\"theme\\":\\"Batman\\",\\"event_date\\":\\"2026-04-20\\",\\"item_notes\\":\\"\\",\\"id\\":\\"call_8ProGeHDdmf3Liq3vaPMThTi\\"}", "tool_calls": [{"id": "call_8ProGeHDdmf3Liq3vaPMThTi", "args": {"id": "call_8ProGeHDdmf3Liq3vaPMThTi", "notes": "", "theme": "Batman", "source": "nova", "currency": "CRC", "quantity": "15", "operation": "upsert_order_context", "event_date": "2026-04-20", "item_notes": "", "product_id": "bag_confitero_20x25_std", "sku_snapshot": "MWL-BAG-CONF-20X25-STD", "lead_thread_id": "68f01174-621c-4a28-9401-98e1e14b631a", "unit_price_crc": "1000", "product_name_snapshot": "Confitero 20x25 cm"}, "name": "Call_TOOL_-_sales_upsert_order_context_", "type": "tool_call"}], "additional_kwargs": {}, "response_metadata": {}, "invalid_tool_calls": []}
757	+50688928728	{"name": "Call_TOOL_-_sales_upsert_order_context_", "type": "tool", "content": "[{\\"response\\":\\"There was an error: \\\\\\"There was an error: \\\\\\"The workflow did not return a response\\\\\\"\\\\\\"\\"}]", "tool_call_id": "call_8ProGeHDdmf3Liq3vaPMThTi", "additional_kwargs": {}, "response_metadata": {}}
758	+50688928728	{"type": "ai", "content": "{\\n  \\"reply_text\\": \\"Perfecto, los confiteros estándar de Batman para el 20 de abril. ¿Cuántos más necesitás o querés que te pase los datos para el adelanto?\\",\\n  \\"intent\\": \\"purchase\\",\\n  \\"stage\\": \\"qualification\\",\\n  \\"confidence\\": 0.95,\\n  \\"risk_flag\\": false,\\n  \\"needs_human\\": false,\\n  \\"human_handoff\\": null,\\n  \\"actions\\": [],\\n  \\"selected_catalog_image_ref\\": null\\n}", "tool_calls": [], "additional_kwargs": {}, "response_metadata": {}, "invalid_tool_calls": []}
765	+50684732111	{"type": "human", "content": "{\\"mensaje\\":\\"Ping\\",\\"ChatID\\":\\"+50684732111\\",\\"NombreCliente\\":\\"4 mas uno Technology\\",\\"lead_thread_key\\":\\"+50684732111\\",\\"lead_thread_id\\":\\"ca6e26a1-147c-498a-8bf5-b0f83c4df99f\\",\\"channel\\":\\"whatsapp\\",\\"provider\\":\\"ycloud\\",\\"external_message_id\\":\\"69c85109992110109dd308f4\\",\\"lead_stage\\":\\"new\\",\\"created_contact\\":\\"false\\",\\"created_lead_thread\\":\\"false\\"}", "additional_kwargs": {}, "response_metadata": {}}
737	+50688928728	{"type": "human", "content": "{\\"mensaje\\":\\"Cuál es la diferencia?\\",\\"ChatID\\":\\"+50688928728\\",\\"NombreCliente\\":\\"Carlos Mata\\",\\"lead_thread_key\\":\\"+50688928728\\",\\"lead_thread_id\\":\\"68f01174-621c-4a28-9401-98e1e14b631a\\",\\"channel\\":\\"whatsapp\\",\\"provider\\":\\"ycloud\\",\\"external_message_id\\":\\"69c8460e3a48151462279c5b\\",\\"lead_stage\\":\\"new\\",\\"created_contact\\":\\"false\\",\\"created_lead_thread\\":\\"false\\"}", "additional_kwargs": {}, "response_metadata": {}}
738	+50688928728	{"type": "ai", "content": "{\\n  \\"reply_text\\": \\"Claro, los bolsos tipo caminata son mochilas personalizadas con diferente tamaño y acabado, mientras que los confiteros son bolsos para dulces, más pequeños y con estilo diferente. ¿Querés que te detalle alguno en particular?\\",\\n  \\"intent\\": \\"inquiry\\",\\n  \\"stage\\": \\"discovery\\",\\n  \\"confidence\\": 0.9,\\n  \\"risk_flag\\": false,\\n  \\"needs_human\\": false,\\n  \\"human_handoff\\": null,\\n  \\"actions\\": [],\\n  \\"selected_catalog_image_ref\\": null\\n}", "tool_calls": [], "additional_kwargs": {}, "response_metadata": {}, "invalid_tool_calls": []}
747	+50688928728	{"type": "human", "content": "{\\"mensaje\\":\\"tienes alguna imagen del estandar?\\",\\"ChatID\\":\\"+50688928728\\",\\"NombreCliente\\":\\"Carlos Mata\\",\\"lead_thread_key\\":\\"+50688928728\\",\\"lead_thread_id\\":\\"68f01174-621c-4a28-9401-98e1e14b631a\\",\\"channel\\":\\"whatsapp\\",\\"provider\\":\\"ycloud\\",\\"external_message_id\\":\\"69c84f903a481514622931c1\\",\\"lead_stage\\":\\"new\\",\\"created_contact\\":\\"false\\",\\"created_lead_thread\\":\\"false\\"}", "additional_kwargs": {}, "response_metadata": {}}
748	+50688928728	{"type": "ai", "content": "{\\n  \\"reply_text\\": \\"Sí, te puedo mostrar una imagen del confitero estándar 20x25 cm.\\",\\n  \\"intent\\": \\"inquiry\\",\\n  \\"stage\\": \\"qualification\\",\\n  \\"confidence\\": 0.9,\\n  \\"risk_flag\\": false,\\n  \\"needs_human\\": false,\\n  \\"human_handoff\\": null,\\n  \\"actions\\": [],\\n  \\"selected_catalog_image_ref\\": \\"bag_confitero_20x25_std\\"\\n}", "tool_calls": [], "additional_kwargs": {}, "response_metadata": {}, "invalid_tool_calls": []}
759	+50688928728	{"type": "human", "content": "{\\"mensaje\\":\\"tengo una duda tendras alguna imagen del caminata ?\\",\\"ChatID\\":\\"+50688928728\\",\\"NombreCliente\\":\\"Carlos Mata\\",\\"lead_thread_key\\":\\"+50688928728\\",\\"lead_thread_id\\":\\"68f01174-621c-4a28-9401-98e1e14b631a\\",\\"channel\\":\\"whatsapp\\",\\"provider\\":\\"ycloud\\",\\"external_message_id\\":\\"69c850a53a48151462296073\\",\\"lead_stage\\":\\"new\\",\\"created_contact\\":\\"false\\",\\"created_lead_thread\\":\\"false\\"}", "additional_kwargs": {}, "response_metadata": {}}
760	+50688928728	{"type": "ai", "content": "{\\n  \\"reply_text\\": \\"Sí claro 😊\\\\n¿Cuál querés ver primero, el confitero o el caminata?\\",\\n  \\"intent\\": \\"inquiry\\",\\n  \\"stage\\": \\"discovery\\",\\n  \\"confidence\\": 0.9,\\n  \\"risk_flag\\": false,\\n  \\"needs_human\\": false,\\n  \\"human_handoff\\": null,\\n  \\"actions\\": [],\\n  \\"selected_catalog_image_ref\\": null\\n}", "tool_calls": [], "additional_kwargs": {}, "response_metadata": {}, "invalid_tool_calls": []}
766	+50684732111	{"type": "ai", "content": "{\\n  \\"reply_text\\": \\"Hola 😊\\\\n¿En qué te puedo ayudar?\\",\\n  \\"intent\\": \\"inquiry\\",\\n  \\"stage\\": \\"discovery\\",\\n  \\"confidence\\": 1.0,\\n  \\"risk_flag\\": false,\\n  \\"needs_human\\": false,\\n  \\"human_handoff\\": null,\\n  \\"actions\\": [],\\n  \\"selected_catalog_image_ref\\": null\\n}", "tool_calls": [], "additional_kwargs": {}, "response_metadata": {}, "invalid_tool_calls": []}
739	+50688928728	{"type": "human", "content": "{\\"mensaje\\":\\"El confitero\\",\\"ChatID\\":\\"+50688928728\\",\\"NombreCliente\\":\\"Carlos Mata\\",\\"lead_thread_key\\":\\"+50688928728\\",\\"lead_thread_id\\":\\"68f01174-621c-4a28-9401-98e1e14b631a\\",\\"channel\\":\\"whatsapp\\",\\"provider\\":\\"ycloud\\",\\"external_message_id\\":\\"69c84b99998c0e7158540ebc\\",\\"lead_stage\\":\\"new\\",\\"created_contact\\":\\"false\\",\\"created_lead_thread\\":\\"false\\"}", "additional_kwargs": {}, "response_metadata": {}}
740	+50688928728	{"type": "ai", "content": "{\\n  \\"reply_text\\": \\"Perfecto, el bolso confitero premium 20x25 cm es totalmente sublimado y tiene un mínimo de 12 unidades. ¿Cuántos ocupás?\\",\\n  \\"intent\\": \\"purchase\\",\\n  \\"stage\\": \\"qualification\\",\\n  \\"confidence\\": 0.95,\\n  \\"risk_flag\\": false,\\n  \\"needs_human\\": false,\\n  \\"human_handoff\\": null,\\n  \\"actions\\": [],\\n  \\"selected_catalog_image_ref\\": \\"bag_confitero_20x25_full\\"\\n}", "tool_calls": [], "additional_kwargs": {}, "response_metadata": {}, "invalid_tool_calls": []}
749	+50688928728	{"type": "human", "content": "{\\"mensaje\\":\\"a ok estos me gustan, cuanto seria el precio de 15\\",\\"ChatID\\":\\"+50688928728\\",\\"NombreCliente\\":\\"Carlos Mata\\",\\"lead_thread_key\\":\\"+50688928728\\",\\"lead_thread_id\\":\\"68f01174-621c-4a28-9401-98e1e14b631a\\",\\"channel\\":\\"whatsapp\\",\\"provider\\":\\"ycloud\\",\\"external_message_id\\":\\"69c84fca998c0e715854ba35\\",\\"lead_stage\\":\\"new\\",\\"created_contact\\":\\"false\\",\\"created_lead_thread\\":\\"false\\"}", "additional_kwargs": {}, "response_metadata": {}}
750	+50688928728	{"type": "ai", "content": "Calling Call_TOOL_-_sales_upsert_order_context_ with input: {\\"operation\\":\\"upsert_order_context\\",\\"lead_thread_id\\":\\"68f01174-621c-4a28-9401-98e1e14b631a\\",\\"currency\\":\\"CRC\\",\\"source\\":\\"nova\\",\\"notes\\":\\"\\",\\"product_id\\":\\"bag_confitero_20x25_std\\",\\"product_name_snapshot\\":\\"Confitero 20x25 cm\\",\\"sku_snapshot\\":\\"MWL-BAG-CONF-20X25-STD\\",\\"quantity\\":\\"15\\",\\"unit_price_crc\\":\\"1000\\",\\"theme\\":\\"\\",\\"event_date\\":\\"\\",\\"item_notes\\":\\"\\",\\"id\\":\\"call_ro9PrMWqa3iKoqiaxbVrdELV\\"}", "tool_calls": [{"id": "call_ro9PrMWqa3iKoqiaxbVrdELV", "args": {"id": "call_ro9PrMWqa3iKoqiaxbVrdELV", "notes": "", "theme": "", "source": "nova", "currency": "CRC", "quantity": "15", "operation": "upsert_order_context", "event_date": "", "item_notes": "", "product_id": "bag_confitero_20x25_std", "sku_snapshot": "MWL-BAG-CONF-20X25-STD", "lead_thread_id": "68f01174-621c-4a28-9401-98e1e14b631a", "unit_price_crc": "1000", "product_name_snapshot": "Confitero 20x25 cm"}, "name": "Call_TOOL_-_sales_upsert_order_context_", "type": "tool_call"}], "additional_kwargs": {}, "response_metadata": {}, "invalid_tool_calls": []}
751	+50688928728	{"name": "Call_TOOL_-_sales_upsert_order_context_", "type": "tool", "content": "[{\\"response\\":\\"There was an error: \\\\\\"There was an error: \\\\\\"The workflow did not return a response\\\\\\"\\\\\\"\\"}]", "tool_call_id": "call_ro9PrMWqa3iKoqiaxbVrdELV", "additional_kwargs": {}, "response_metadata": {}}
752	+50688928728	{"type": "ai", "content": "Calling Call_TOOL_-_catalog_search with input: {\\"query\\":\\"confitero\\",\\"limit\\":\\"5\\",\\"max_price_crc\\":\\"\\",\\"min_qty\\":\\"15\\",\\"category\\":\\"\\",\\"id\\":\\"call_lsrWanhgi4dzh7UZJk3Okz5D\\"}", "tool_calls": [{"id": "call_lsrWanhgi4dzh7UZJk3Okz5D", "args": {"id": "call_lsrWanhgi4dzh7UZJk3Okz5D", "limit": "5", "query": "confitero", "min_qty": "15", "category": "", "max_price_crc": ""}, "name": "Call_TOOL_-_catalog_search", "type": "tool_call"}], "additional_kwargs": {}, "response_metadata": {}, "invalid_tool_calls": []}
753	+50688928728	{"name": "Call_TOOL_-_catalog_search", "type": "tool", "content": "[{\\"found\\":true,\\"lookup_mode\\":\\"semantic\\",\\"exact_product_id\\":null,\\"result_count\\":5,\\"best_match_quality\\":\\"exact\\",\\"results\\":[{\\"id\\":\\"bag_confitero_20x25_std\\",\\"sku\\":\\"MWL-BAG-CONF-20X25-STD\\",\\"name\\":\\"Confitero 20x25 cm\\",\\"category\\":\\"bolsos\\",\\"family\\":\\"confitero\\",\\"variant_label\\":\\"estandar\\",\\"size_label\\":\\"20x25 cm\\",\\"price_crc\\":1000,\\"price_from_crc\\":null,\\"min_qty\\":5,\\"summary\\":\\"Bolso confitero en tela blanca.\\",\\"details\\":\\"Personalización temática frontal.\\",\\"notes\\":\\"Se puede incluir nombre del invitado sin costo adicional.\\",\\"aliases\\":[\\"bolso confitero\\",\\"candy bag tela\\",\\"confitero\\",\\"saquito confitero\\"],\\"source_type\\":\\"owner_direct\\",\\"source_ref\\":\\"Actualizacion manual bolsos marzo 2026\\",\\"image\\":{\\"bucket\\":\\"mwl-products\\",\\"path\\":\\"products/bag_confitero_20x25_std/main.jpeg\\",\\"alt_text\\":\\"Bolso tipo caminata 20x25 cm standard\\"},\\"exact_match\\":true,\\"direct_match\\":true,\\"match_quality\\":\\"exact\\",\\"score\\":11.65},{\\"id\\":\\"bag_confitero_20x25_full\\",\\"sku\\":\\"MWL-BAG-CONF-20X25-FULL\\",\\"name\\":\\"Bolso tipo confitero premium 20x25 cm\\",\\"category\\":\\"bolsos\\",\\"family\\":\\"confitero\\",\\"variant_label\\":\\"premium\\",\\"size_label\\":\\"20x25 cm\\",\\"price_crc\\":1600,\\"price_from_crc\\":null,\\"min_qty\\":12,\\"summary\\":\\"Bolso confitero premium totalmente sublimado.\\",\\"details\\":\\"Tela trasera de color.\\",\\"notes\\":null,\\"aliases\\":[\\"bolso confitero\\",\\"bolso confitero premium\\",\\"bolso sublimado premium\\",\\"candy bag tela\\",\\"confitero premium\\",\\"saquito confitero\\"],\\"source_type\\":\\"catalog_pdf\\",\\"source_ref\\":\\"Fiestas2026.pdf\\",\\"image\\":null,\\"exact_match\\":false,\\"direct_match\\":true,\\"match_quality\\":\\"strong\\",\\"score\\":10.9},{\\"id\\":\\"bag_confitero_30x35_std\\",\\"sku\\":\\"MWL-BAG-CONF-30X35-STD\\",\\"name\\":\\"Confitero 30x35 cm\\",\\"category\\":\\"bolsos\\",\\"family\\":\\"confitero\\",\\"variant_label\\":\\"estandar\\",\\"size_label\\":\\"30x35 cm\\",\\"price_crc\\":1300,\\"price_from_crc\\":null,\\"min_qty\\":5,\\"summary\\":\\"Bolso confitero en tela blanca.\\",\\"details\\":\\"Personalización temática frontal.\\",\\"notes\\":\\"Se puede incluir nombre del invitado sin costo adicional.\\",\\"aliases\\":[\\"bolso confitero\\",\\"candy bag tela\\",\\"confitero grande\\",\\"saquito confitero grande\\",\\"saquito confitero\\"],\\"source_type\\":\\"owner_direct\\",\\"source_ref\\":\\"Actualizacion manual bolsos marzo 2026\\",\\"image\\":null,\\"exact_match\\":false,\\"direct_match\\":true,\\"match_quality\\":\\"strong\\",\\"score\\":10.65},{\\"id\\":\\"kit_creativo_std\\",\\"sku\\":\\"MWL-KIT-CREATIVO-STD\\",\\"name\\":\\"Kit creativo personalizado\\",\\"category\\":\\"kits\\",\\"family\\":\\"kit_creativo\\",\\"variant_label\\":\\"estandar\\",\\"size_label\\":null,\\"price_crc\\":null,\\"price_from_crc\\":4500,\\"min_qty\\":10,\\"summary\\":\\"Kit personalizado para celebraciones.\\",\\"details\\":\\"Incluye libro de colorear, vaso personalizado, bolso confitero y crayolas.\\",\\"notes\\":null,\\"aliases\\":[\\"combo creativo\\",\\"kit creativo\\",\\"kit personalizado\\"],\\"source_type\\":\\"catalog_pdf\\",\\"source_ref\\":\\"Fiestas2026.pdf\\",\\"image\\":null,\\"exact_match\\":false,\\"direct_match\\":true,\\"match_quality\\":\\"strong\\",\\"score\\":2.473},{\\"id\\":\\"bag_caminata_20x25_full\\",\\"sku\\":\\"MWL-BAG-CAM-20X25-FULL\\",\\"name\\":\\"Caminata 20x25 cm Full Sublimada\\",\\"category\\":\\"bolsos\\",\\"family\\":\\"caminata\\",\\"variant_label\\":\\"premium\\",\\"size_label\\":\\"20x25 cm\\",\\"price_crc\\":2500,\\"price_from_crc\\":null,\\"min_qty\\":5,\\"summary\\":\\"Bolso tipo caminata completamente sublimado.\\",\\"details\\":\\"Parte trasera puede ser de color. Es la unica opcion totalmente colorida.\\",\\"notes\\":\\"Tiene descuento del 5% solo en pedidos mayores a 15 unidades. El agente no debe ofrecerlo si el cliente no lo pide.\\",\\"aliases\\":[\\"bolso caminata\\",\\"bolso premium caminata\\",\\"bolso tipo caminata\\",\\"caminata colorida\\",\\"caminata full sublimada\\",\\"caminata premium\\",\\"bolso de espalda\\",\\"backpack\\",\\"bolsos tipo backpack\\",\\"mochilita\\"],\\"source_type\\":\\"owner_direct\\",\\"source_ref\\":\\"Actualizacion manual bolsos marzo 2026\\",\\"image\\":{\\"bucket\\":\\"mwl-products\\",\\"path\\":\\"products/bag_caminata_20x25_full/main.jpeg\\",\\"alt_text\\":\\"Bolso tipo caminata 20x25 cm full sublimado\\"},\\"exact_match\\":false,\\"direct_match\\":false,\\"match_quality\\":\\"strong\\",\\"score\\":2.814}],\\"source\\":[\\"Actualizacion manual bolsos marzo 2026\\",\\"Fiestas2026.pdf\\"],\\"notes\\":null,\\"confidence\\":0.96}]", "tool_call_id": "call_lsrWanhgi4dzh7UZJk3Okz5D", "additional_kwargs": {}, "response_metadata": {}}
761	+50688928728	{"type": "human", "content": "{\\"mensaje\\":\\"el caminata\\",\\"ChatID\\":\\"+50688928728\\",\\"NombreCliente\\":\\"Carlos Mata\\",\\"lead_thread_key\\":\\"+50688928728\\",\\"lead_thread_id\\":\\"68f01174-621c-4a28-9401-98e1e14b631a\\",\\"channel\\":\\"whatsapp\\",\\"provider\\":\\"ycloud\\",\\"external_message_id\\":\\"69c850ba3a4815146229642e\\",\\"lead_stage\\":\\"new\\",\\"created_contact\\":\\"false\\",\\"created_lead_thread\\":\\"false\\"}", "additional_kwargs": {}, "response_metadata": {}}
762	+50688928728	{"type": "ai", "content": "{\\n  \\"reply_text\\": \\"Perfecto, el bolso caminata premium es full sublimado y mide 20x25 cm. ¿Cuántos ocupás?\\",\\n  \\"intent\\": \\"purchase\\",\\n  \\"stage\\": \\"qualification\\",\\n  \\"confidence\\": 0.95,\\n  \\"risk_flag\\": false,\\n  \\"needs_human\\": false,\\n  \\"human_handoff\\": null,\\n  \\"actions\\": [],\\n  \\"selected_catalog_image_ref\\": \\"bag_caminata_20x25_full\\"\\n}", "tool_calls": [], "additional_kwargs": {}, "response_metadata": {}, "invalid_tool_calls": []}
767	+50688928728	{"type": "human", "content": "{\\"mensaje\\":\\"y se te compro 30 en cuanto me los dejas\\",\\"ChatID\\":\\"+50688928728\\",\\"NombreCliente\\":\\"Carlos Mata\\",\\"lead_thread_key\\":\\"+50688928728\\",\\"lead_thread_id\\":\\"68f01174-621c-4a28-9401-98e1e14b631a\\",\\"channel\\":\\"whatsapp\\",\\"provider\\":\\"ycloud\\",\\"external_message_id\\":\\"69c8511b5eaa0e49ca03c630\\",\\"lead_stage\\":\\"new\\",\\"created_contact\\":\\"false\\",\\"created_lead_thread\\":\\"false\\"}", "additional_kwargs": {}, "response_metadata": {}}
768	+50688928728	{"type": "ai", "content": "Calling Call_TOOL_-_catalog_search with input: {\\"query\\":\\"bolso caminata premium\\",\\"limit\\":\\"5\\",\\"max_price_crc\\":\\"\\",\\"min_qty\\":\\"30\\",\\"category\\":\\"\\",\\"id\\":\\"call_QjQ8edq87EiMUCBaTXDYDelS\\"}", "tool_calls": [{"id": "call_QjQ8edq87EiMUCBaTXDYDelS", "args": {"id": "call_QjQ8edq87EiMUCBaTXDYDelS", "limit": "5", "query": "bolso caminata premium", "min_qty": "30", "category": "", "max_price_crc": ""}, "name": "Call_TOOL_-_catalog_search", "type": "tool_call"}], "additional_kwargs": {}, "response_metadata": {}, "invalid_tool_calls": []}
789	+50688928728	{"type": "human", "content": "{\\"mensaje\\":\\"si\\",\\"ChatID\\":\\"+50688928728\\",\\"NombreCliente\\":\\"Carlos Mata\\",\\"lead_thread_key\\":\\"+50688928728\\",\\"lead_thread_id\\":\\"68f01174-621c-4a28-9401-98e1e14b631a\\",\\"channel\\":\\"whatsapp\\",\\"provider\\":\\"ycloud\\",\\"external_message_id\\":\\"69c85e8fc18fbd6bf13d36f5\\",\\"lead_stage\\":\\"new\\",\\"created_contact\\":\\"false\\",\\"created_lead_thread\\":\\"false\\"}", "additional_kwargs": {}, "response_metadata": {}}
801	+50688928728	{"name": "Call_TOOL_-_sales_register_", "type": "tool", "content": "[{\\"success\\":false,\\"error\\":\\"order_not_found\\",\\"message\\":\\"No order was found for the provided order_id or lead_thread_id\\"}]", "tool_call_id": "call_yDtPbpKnwBr6TYTWKbo7EAks", "additional_kwargs": {}, "response_metadata": {}}
823	+50688928728	{"type": "human", "content": "{\\"mensaje\\":\\"Cuánto sería el monto?\\",\\"ChatID\\":\\"+50688928728\\",\\"NombreCliente\\":\\"Carlos Mata\\",\\"lead_thread_key\\":\\"+50688928728\\",\\"lead_thread_id\\":\\"68f01174-621c-4a28-9401-98e1e14b631a\\",\\"channel\\":\\"whatsapp\\",\\"provider\\":\\"ycloud\\",\\"external_message_id\\":\\"69cb3435c18fbd6bf1db052e\\",\\"lead_stage\\":\\"new\\",\\"created_contact\\":\\"false\\",\\"created_lead_thread\\":\\"false\\"}", "additional_kwargs": {}, "response_metadata": {}}
824	+50688928728	{"type": "ai", "content": "{\\n  \\"reply_text\\": \\"Para 10 unidades, el precio queda en ₡2200 cada uno.\\\\nEl total sería ₡22,000.\\",\\n  \\"intent\\": \\"offer\\",\\n  \\"stage\\": \\"offer\\",\\n  \\"confidence\\": 0.95,\\n  \\"risk_flag\\": false,\\n  \\"needs_human\\": false,\\n  \\"human_handoff\\": null,\\n  \\"actions\\": [],\\n  \\"selected_catalog_image_ref\\": null\\n}", "tool_calls": [], "additional_kwargs": {}, "response_metadata": {}, "invalid_tool_calls": []}
825	+50688928728	{"type": "human", "content": "{\\"mensaje\\":\\"Ok, se pueden hacer de batman?\\",\\"ChatID\\":\\"+50688928728\\",\\"NombreCliente\\":\\"Carlos Mata\\",\\"lead_thread_key\\":\\"+50688928728\\",\\"lead_thread_id\\":\\"68f01174-621c-4a28-9401-98e1e14b631a\\",\\"channel\\":\\"whatsapp\\",\\"provider\\":\\"ycloud\\",\\"external_message_id\\":\\"69cb3454c18fbd6bf1db0d36\\",\\"lead_stage\\":\\"new\\",\\"created_contact\\":\\"false\\",\\"created_lead_thread\\":\\"false\\"}", "additional_kwargs": {}, "response_metadata": {}}
826	+50688928728	{"type": "ai", "content": "{\\n  \\"reply_text\\": \\"Claro, se pueden personalizar con la temática de Batman.\\\\n¿Querés confirmar la fecha del evento para agendar tu pedido?\\",\\n  \\"intent\\": \\"qualification\\",\\n  \\"stage\\": \\"qualification\\",\\n  \\"confidence\\": 0.95,\\n  \\"risk_flag\\": false,\\n  \\"needs_human\\": false,\\n  \\"human_handoff\\": null,\\n  \\"actions\\": [],\\n  \\"selected_catalog_image_ref\\": null\\n}", "tool_calls": [], "additional_kwargs": {}, "response_metadata": {}, "invalid_tool_calls": []}
827	+50688928728	{"type": "human", "content": "{\\"mensaje\\":\\"20 de junio\\",\\"ChatID\\":\\"+50688928728\\",\\"NombreCliente\\":\\"Carlos Mata\\",\\"lead_thread_key\\":\\"+50688928728\\",\\"lead_thread_id\\":\\"68f01174-621c-4a28-9401-98e1e14b631a\\",\\"channel\\":\\"whatsapp\\",\\"provider\\":\\"ycloud\\",\\"external_message_id\\":\\"69cb34715eaa0e49caa3647e\\",\\"lead_stage\\":\\"new\\",\\"created_contact\\":\\"false\\",\\"created_lead_thread\\":\\"false\\"}", "additional_kwargs": {}, "response_metadata": {}}
828	+50688928728	{"type": "ai", "content": "Calling Call_TOOL_-_sales_upsert_order_context_ with input: {\\"operation\\":\\"upsert_order_context\\",\\"lead_thread_id\\":\\"68f01174-621c-4a28-9401-98e1e14b631a\\",\\"currency\\":\\"CRC\\",\\"source\\":\\"nova\\",\\"notes\\":\\"\\",\\"product_id\\":\\"cups_vinyl_std\\",\\"product_name_snapshot\\":\\"Vasos personalizados\\",\\"sku_snapshot\\":\\"MWL-CUP-VINYL-STD\\",\\"quantity\\":\\"10\\",\\"unit_price_crc\\":\\"2200\\",\\"theme\\":\\"Batman\\",\\"event_date\\":\\"2024-06-20\\",\\"item_notes\\":\\"\\",\\"id\\":\\"call_N5zkfP7IG7henR7Oqi9TJ7RZ\\"}", "tool_calls": [{"id": "call_N5zkfP7IG7henR7Oqi9TJ7RZ", "args": {"id": "call_N5zkfP7IG7henR7Oqi9TJ7RZ", "notes": "", "theme": "Batman", "source": "nova", "currency": "CRC", "quantity": "10", "operation": "upsert_order_context", "event_date": "2024-06-20", "item_notes": "", "product_id": "cups_vinyl_std", "sku_snapshot": "MWL-CUP-VINYL-STD", "lead_thread_id": "68f01174-621c-4a28-9401-98e1e14b631a", "unit_price_crc": "2200", "product_name_snapshot": "Vasos personalizados"}, "name": "Call_TOOL_-_sales_upsert_order_context_", "type": "tool_call"}], "additional_kwargs": {}, "response_metadata": {}, "invalid_tool_calls": []}
829	+50688928728	{"name": "Call_TOOL_-_sales_upsert_order_context_", "type": "tool", "content": "[{\\"success\\":true,\\"operation\\":\\"upsert_order_context\\",\\"order_id\\":\\"5ecf3af5-bf0d-40d6-b9bc-77cf8cec5a11\\",\\"lead_thread_id\\":\\"68f01174-621c-4a28-9401-98e1e14b631a\\",\\"status\\":\\"draft\\",\\"payment_status\\":\\"pending_validation\\",\\"currency\\":\\"CRC\\",\\"subtotal_crc\\":22000,\\"total_crc\\":22000,\\"item_count\\":1,\\"message\\":\\"Order context upserted successfully\\"}]", "tool_call_id": "call_N5zkfP7IG7henR7Oqi9TJ7RZ", "additional_kwargs": {}, "response_metadata": {}}
830	+50688928728	{"type": "ai", "content": "{\\n  \\"reply_text\\": \\"Perfecto, el total sería ₡22,000 y el adelanto del 60% sería ₡13,200.\\\\nTe dejo los datos para el pago:\\\\nBanco: Banco de Costa Rica (BCR)\\\\nTitular: Carlos Alberto Mata Ramírez\\\\nIBAN: CR96015202001157219818\\\\nSINPE Móvil: 8813-1053 (Karol Bolaños Meneses)\\\\nPor favor, envía el comprobante cuando realices el pago.\\",\\n  \\"intent\\": \\"close\\",\\n  \\"stage\\": \\"close\\",\\n  \\"confidence\\": 0.98,\\n  \\"risk_flag\\": false,\\n  \\"needs_human\\": false,\\n  \\"human_handoff\\": null,\\n  \\"actions\\": [],\\n  \\"selected_catalog_image_ref\\": null\\n}", "tool_calls": [], "additional_kwargs": {}, "response_metadata": {}, "invalid_tool_calls": []}
839	+50688928728	{"name": "Call_TOOL_-_sales_upsert_order_context_", "type": "tool", "content": "[{\\"success\\":true,\\"operation\\":\\"upsert_order_context\\",\\"order_id\\":\\"5ecf3af5-bf0d-40d6-b9bc-77cf8cec5a11\\",\\"lead_thread_id\\":\\"68f01174-621c-4a28-9401-98e1e14b631a\\",\\"status\\":\\"draft\\",\\"payment_status\\":\\"pending_validation\\",\\"currency\\":\\"CRC\\",\\"subtotal_crc\\":22000,\\"total_crc\\":22000,\\"item_count\\":1,\\"message\\":\\"Order context upserted successfully\\"}]", "tool_call_id": "call_yuwcnd6Rjo9lARJlrojcspbP", "additional_kwargs": {}, "response_metadata": {}}
840	+50688928728	{"type": "ai", "content": "Calling Call_TOOL_-_sales_register_ with input: {\\"operation\\":\\"register_payment_receipt_review\\",\\"lead_thread_id\\":\\"68f01174-621c-4a28-9401-98e1e14b631a\\",\\"order_id\\":\\"5ecf3af5-bf0d-40d6-b9bc-77cf8cec5a11\\",\\"provider\\":\\"ycloud\\",\\"external_message_id\\":\\"69cb4ba53a48151462cda978\\",\\"receipt_key\\":\\"\\",\\"amount_text\\":\\"₡9,000.00\\",\\"currency\\":\\"CRC\\",\\"bank\\":\\"BAC\\",\\"transfer_type\\":\\"SINPE Móvil\\",\\"reference\\":\\"\\",\\"sender_name\\":\\"SANDRA VERONICA AGUILAR GALDAMEZ\\",\\"recipient_name\\":\\"KAROL ANDREA BOLAÑOS MENESES\\",\\"destination_phone\\":\\"88131053\\",\\"receipt_date\\":\\"2026-02-27\\",\\"receipt_time\\":\\"14:17\\",\\"raw_payload\\":\\"Cliente envio una imagen de comprobante de pago. Banco detectado: BAC. Tipo: SINPE Móvil. Monto detectado: ₡9,000.00. Remitente: SANDRA VERONICA AGUILAR GALDAMEZ. Destinatario: KAROL ANDREA BOLAÑOS MENESES. Telefono destino: 88131053. FechaComprobante: 27 febrero 2026. HoraComprobante: 2:17 PM. ConceptoComprobante: Bolsitas de confites. El cliente aparentemente envio el comprobante del adelanto.\\",\\"id\\":\\"call_WoPAuubUZ9NzrrHrXTAJQy2C\\"}", "tool_calls": [{"id": "call_WoPAuubUZ9NzrrHrXTAJQy2C", "args": {"id": "call_WoPAuubUZ9NzrrHrXTAJQy2C", "bank": "BAC", "currency": "CRC", "order_id": "5ecf3af5-bf0d-40d6-b9bc-77cf8cec5a11", "provider": "ycloud", "operation": "register_payment_receipt_review", "reference": "", "amount_text": "₡9,000.00", "raw_payload": "Cliente envio una imagen de comprobante de pago. Banco detectado: BAC. Tipo: SINPE Móvil. Monto detectado: ₡9,000.00. Remitente: SANDRA VERONICA AGUILAR GALDAMEZ. Destinatario: KAROL ANDREA BOLAÑOS MENESES. Telefono destino: 88131053. FechaComprobante: 27 febrero 2026. HoraComprobante: 2:17 PM. ConceptoComprobante: Bolsitas de confites. El cliente aparentemente envio el comprobante del adelanto.", "receipt_key": "", "sender_name": "SANDRA VERONICA AGUILAR GALDAMEZ", "receipt_date": "2026-02-27", "receipt_time": "14:17", "transfer_type": "SINPE Móvil", "lead_thread_id": "68f01174-621c-4a28-9401-98e1e14b631a", "recipient_name": "KAROL ANDREA BOLAÑOS MENESES", "destination_phone": "88131053", "external_message_id": "69cb4ba53a48151462cda978"}, "name": "Call_TOOL_-_sales_register_", "type": "tool_call"}], "additional_kwargs": {}, "response_metadata": {}, "invalid_tool_calls": []}
841	+50688928728	{"name": "Call_TOOL_-_sales_register_", "type": "tool", "content": "[{\\"response\\":\\"There was an error: \\\\\\"invalid input syntax for type uuid: \\\\\\"ycloud:69cb4ba53a48151462cda978\\\\\\"\\\\\\"\\"}]", "tool_call_id": "call_WoPAuubUZ9NzrrHrXTAJQy2C", "additional_kwargs": {}, "response_metadata": {}}
790	+50688928728	{"type": "ai", "content": "Calling Call_TOOL_-_sales_upsert_order_context_ with input: {\\"operation\\":\\"upsert_order_context\\",\\"lead_thread_id\\":\\"68f01174-621c-4a28-9401-98e1e14b631a\\",\\"currency\\":\\"CRC\\",\\"source\\":\\"nova\\",\\"notes\\":\\"\\",\\"product_id\\":\\"bag_caminata_20x25_full\\",\\"product_name_snapshot\\":\\"Caminata 20x25 cm Full Sublimada\\",\\"sku_snapshot\\":\\"MWL-BAG-CAM-20X25-FULL\\",\\"quantity\\":\\"30\\",\\"unit_price_crc\\":\\"2500\\",\\"theme\\":\\"\\",\\"event_date\\":\\"\\",\\"item_notes\\":\\"\\",\\"id\\":\\"call_NL0a3AgsoJlPhWsWWwlmHHOT\\"}", "tool_calls": [{"id": "call_NL0a3AgsoJlPhWsWWwlmHHOT", "args": {"id": "call_NL0a3AgsoJlPhWsWWwlmHHOT", "notes": "", "theme": "", "source": "nova", "currency": "CRC", "quantity": "30", "operation": "upsert_order_context", "event_date": "", "item_notes": "", "product_id": "bag_caminata_20x25_full", "sku_snapshot": "MWL-BAG-CAM-20X25-FULL", "lead_thread_id": "68f01174-621c-4a28-9401-98e1e14b631a", "unit_price_crc": "2500", "product_name_snapshot": "Caminata 20x25 cm Full Sublimada"}, "name": "Call_TOOL_-_sales_upsert_order_context_", "type": "tool_call"}], "additional_kwargs": {}, "response_metadata": {}, "invalid_tool_calls": []}
791	+50688928728	{"name": "Call_TOOL_-_sales_upsert_order_context_", "type": "tool", "content": "[{\\"response\\":\\"There was an error: \\\\\\"There was an error: \\\\\\"The workflow did not return a response\\\\\\"\\\\\\"\\"}]", "tool_call_id": "call_NL0a3AgsoJlPhWsWWwlmHHOT", "additional_kwargs": {}, "response_metadata": {}}
792	+50688928728	{"type": "ai", "content": "{\\n  \\"reply_text\\": \\"Para 30 unidades, el precio queda en ₡2500 cada uno. El total sería ₡75,000.\\\\n¿Querés que te pase los datos para el pago del adelanto?\\",\\n  \\"intent\\": \\"close\\",\\n  \\"stage\\": \\"close\\",\\n  \\"confidence\\": 0.95,\\n  \\"risk_flag\\": false,\\n  \\"needs_human\\": false,\\n  \\"human_handoff\\": null,\\n  \\"actions\\": [],\\n  \\"selected_catalog_image_ref\\": null\\n}", "tool_calls": [], "additional_kwargs": {}, "response_metadata": {}, "invalid_tool_calls": []}
793	+50688928728	{"type": "human", "content": "{\\"mensaje\\":\\"y no hay descuento?\\",\\"ChatID\\":\\"+50688928728\\",\\"NombreCliente\\":\\"Carlos Mata\\",\\"lead_thread_key\\":\\"+50688928728\\",\\"lead_thread_id\\":\\"68f01174-621c-4a28-9401-98e1e14b631a\\",\\"channel\\":\\"whatsapp\\",\\"provider\\":\\"ycloud\\",\\"external_message_id\\":\\"69c85ed55eaa0e49ca0603de\\",\\"lead_stage\\":\\"new\\",\\"created_contact\\":\\"false\\",\\"created_lead_thread\\":\\"false\\"}", "additional_kwargs": {}, "response_metadata": {}}
794	+50688928728	{"type": "ai", "content": "Calling Call_TOOL_-_sales_upsert_order_context_ with input: {\\"operation\\":\\"upsert_order_context\\",\\"lead_thread_id\\":\\"68f01174-621c-4a28-9401-98e1e14b631a\\",\\"currency\\":\\"CRC\\",\\"source\\":\\"nova\\",\\"notes\\":\\"\\",\\"product_id\\":\\"bag_caminata_20x25_full\\",\\"product_name_snapshot\\":\\"Caminata 20x25 cm Full Sublimada\\",\\"sku_snapshot\\":\\"MWL-BAG-CAM-20X25-FULL\\",\\"quantity\\":\\"30\\",\\"unit_price_crc\\":\\"2375\\",\\"theme\\":\\"\\",\\"event_date\\":\\"\\",\\"item_notes\\":\\"\\",\\"id\\":\\"call_pZPxmiER7b8m9y17kMrhDw6X\\"}", "tool_calls": [{"id": "call_pZPxmiER7b8m9y17kMrhDw6X", "args": {"id": "call_pZPxmiER7b8m9y17kMrhDw6X", "notes": "", "theme": "", "source": "nova", "currency": "CRC", "quantity": "30", "operation": "upsert_order_context", "event_date": "", "item_notes": "", "product_id": "bag_caminata_20x25_full", "sku_snapshot": "MWL-BAG-CAM-20X25-FULL", "lead_thread_id": "68f01174-621c-4a28-9401-98e1e14b631a", "unit_price_crc": "2375", "product_name_snapshot": "Caminata 20x25 cm Full Sublimada"}, "name": "Call_TOOL_-_sales_upsert_order_context_", "type": "tool_call"}], "additional_kwargs": {}, "response_metadata": {}, "invalid_tool_calls": []}
795	+50688928728	{"name": "Call_TOOL_-_sales_upsert_order_context_", "type": "tool", "content": "[{\\"response\\":\\"There was an error: \\\\\\"There was an error: \\\\\\"The workflow did not return a response\\\\\\"\\\\\\"\\"}]", "tool_call_id": "call_pZPxmiER7b8m9y17kMrhDw6X", "additional_kwargs": {}, "response_metadata": {}}
796	+50688928728	{"type": "ai", "content": "{\\n  \\"reply_text\\": \\"Para 30 unidades, con el descuento del 5%, el precio queda en ₡2375 cada uno. El total sería ₡71,250.\\\\n¿Querés que te pase los datos para el pago del adelanto?\\",\\n  \\"intent\\": \\"close\\",\\n  \\"stage\\": \\"close\\",\\n  \\"confidence\\": 0.95,\\n  \\"risk_flag\\": false,\\n  \\"needs_human\\": false,\\n  \\"human_handoff\\": null,\\n  \\"actions\\": [],\\n  \\"selected_catalog_image_ref\\": null\\n}", "tool_calls": [], "additional_kwargs": {}, "response_metadata": {}, "invalid_tool_calls": []}
797	+50688928728	{"type": "human", "content": "{\\"mensaje\\":\\"si\\",\\"ChatID\\":\\"+50688928728\\",\\"NombreCliente\\":\\"Carlos Mata\\",\\"lead_thread_key\\":\\"+50688928728\\",\\"lead_thread_id\\":\\"68f01174-621c-4a28-9401-98e1e14b631a\\",\\"channel\\":\\"whatsapp\\",\\"provider\\":\\"ycloud\\",\\"external_message_id\\":\\"69c85ef6c18fbd6bf13d486b\\",\\"lead_stage\\":\\"new\\",\\"created_contact\\":\\"false\\",\\"created_lead_thread\\":\\"false\\"}", "additional_kwargs": {}, "response_metadata": {}}
798	+50688928728	{"type": "ai", "content": "Calling Call_TOOL_-_sales_upsert_order_context_ with input: {\\"operation\\":\\"upsert_order_context\\",\\"lead_thread_id\\":\\"68f01174-621c-4a28-9401-98e1e14b631a\\",\\"currency\\":\\"CRC\\",\\"source\\":\\"nova\\",\\"notes\\":\\"\\",\\"product_id\\":\\"bag_caminata_20x25_full\\",\\"product_name_snapshot\\":\\"Caminata 20x25 cm Full Sublimada\\",\\"sku_snapshot\\":\\"MWL-BAG-CAM-20X25-FULL\\",\\"quantity\\":\\"30\\",\\"unit_price_crc\\":\\"2375\\",\\"theme\\":\\"\\",\\"event_date\\":\\"\\",\\"item_notes\\":\\"\\",\\"id\\":\\"call_afaWtvlifqWp11IznjrHDTDb\\"}", "tool_calls": [{"id": "call_afaWtvlifqWp11IznjrHDTDb", "args": {"id": "call_afaWtvlifqWp11IznjrHDTDb", "notes": "", "theme": "", "source": "nova", "currency": "CRC", "quantity": "30", "operation": "upsert_order_context", "event_date": "", "item_notes": "", "product_id": "bag_caminata_20x25_full", "sku_snapshot": "MWL-BAG-CAM-20X25-FULL", "lead_thread_id": "68f01174-621c-4a28-9401-98e1e14b631a", "unit_price_crc": "2375", "product_name_snapshot": "Caminata 20x25 cm Full Sublimada"}, "name": "Call_TOOL_-_sales_upsert_order_context_", "type": "tool_call"}], "additional_kwargs": {}, "response_metadata": {}, "invalid_tool_calls": []}
799	+50688928728	{"name": "Call_TOOL_-_sales_upsert_order_context_", "type": "tool", "content": "[{\\"response\\":\\"There was an error: \\\\\\"There was an error: \\\\\\"The workflow did not return a response\\\\\\"\\\\\\"\\"}]", "tool_call_id": "call_afaWtvlifqWp11IznjrHDTDb", "additional_kwargs": {}, "response_metadata": {}}
800	+50688928728	{"type": "ai", "content": "Calling Call_TOOL_-_sales_register_ with input: {\\"operation\\":\\"register_payment_receipt_review\\",\\"lead_thread_id\\":\\"68f01174-621c-4a28-9401-98e1e14b631a\\",\\"provider\\":\\"ycloud\\",\\"external_message_id\\":\\"69c85ef6c18fbd6bf13d486b\\",\\"receipt_key\\":\\"\\",\\"amount_text\\":\\"\\",\\"currency\\":\\"\\",\\"bank\\":\\"\\",\\"transfer_type\\":\\"\\",\\"reference\\":\\"\\",\\"sender_name\\":\\"\\",\\"recipient_name\\":\\"\\",\\"destination_phone\\":\\"\\",\\"receipt_date\\":\\"\\",\\"receipt_time\\":\\"\\",\\"raw_payload\\":\\"\\",\\"order_id\\":\\"\\",\\"id\\":\\"call_yDtPbpKnwBr6TYTWKbo7EAks\\"}", "tool_calls": [{"id": "call_yDtPbpKnwBr6TYTWKbo7EAks", "args": {"id": "call_yDtPbpKnwBr6TYTWKbo7EAks", "bank": "", "currency": "", "order_id": "", "provider": "ycloud", "operation": "register_payment_receipt_review", "reference": "", "amount_text": "", "raw_payload": "", "receipt_key": "", "sender_name": "", "receipt_date": "", "receipt_time": "", "transfer_type": "", "lead_thread_id": "68f01174-621c-4a28-9401-98e1e14b631a", "recipient_name": "", "destination_phone": "", "external_message_id": "69c85ef6c18fbd6bf13d486b"}, "name": "Call_TOOL_-_sales_register_", "type": "tool_call"}], "additional_kwargs": {}, "response_metadata": {}, "invalid_tool_calls": []}
802	+50688928728	{"type": "ai", "content": "{\\n  \\"reply_text\\": \\"El total sería ₡71,250 y el adelanto del 60% sería ₡42,750.\\\\nTe dejo los datos para el pago:\\\\n\\\\nBanco: Banco de Costa Rica (BCR)\\\\nTitular: Carlos Alberto Mata Ramírez\\\\nIBAN: CR96015202001157219818\\\\n\\\\nSINPE Móvil:\\\\nNúmero: 8813-1053\\\\nNombre: Karol Bolaños Meneses\\\\n\\\\nUna vez realizado el pago, envíame el comprobante para confirmar el pedido.\\",\\n  \\"intent\\": \\"close\\",\\n  \\"stage\\": \\"close\\",\\n  \\"confidence\\": 0.95,\\n  \\"risk_flag\\": false,\\n  \\"needs_human\\": false,\\n  \\"human_handoff\\": null,\\n  \\"actions\\": [],\\n  \\"selected_catalog_image_ref\\": null\\n}", "tool_calls": [], "additional_kwargs": {}, "response_metadata": {}, "invalid_tool_calls": []}
813	+50688928728	{"type": "human", "content": "{\\"mensaje\\":\\"Buenas noches\\",\\"ChatID\\":\\"+50688928728\\",\\"NombreCliente\\":\\"Carlos Mata\\",\\"lead_thread_key\\":\\"+50688928728\\",\\"lead_thread_id\\":\\"68f01174-621c-4a28-9401-98e1e14b631a\\",\\"channel\\":\\"whatsapp\\",\\"provider\\":\\"ycloud\\",\\"external_message_id\\":\\"69cb3201c18fbd6bf1da7649\\",\\"lead_stage\\":\\"new\\",\\"created_contact\\":\\"false\\",\\"created_lead_thread\\":\\"false\\"}", "additional_kwargs": {}, "response_metadata": {}}
814	+50688928728	{"type": "ai", "content": "{\\n  \\"reply_text\\": \\"Hola 😊\\\\n¿Todavía estás viendo lo de los bolsos para la fiesta?\\",\\n  \\"intent\\": \\"followup\\",\\n  \\"stage\\": \\"discovery\\",\\n  \\"confidence\\": 0.9,\\n  \\"risk_flag\\": false,\\n  \\"needs_human\\": false,\\n  \\"human_handoff\\": null,\\n  \\"actions\\": [],\\n  \\"selected_catalog_image_ref\\": null\\n}", "tool_calls": [], "additional_kwargs": {}, "response_metadata": {}, "invalid_tool_calls": []}
815	+50688928728	{"type": "human", "content": "{\\"mensaje\\":\\"Tienen vasos?\\",\\"ChatID\\":\\"+50688928728\\",\\"NombreCliente\\":\\"Carlos Mata\\",\\"lead_thread_key\\":\\"+50688928728\\",\\"lead_thread_id\\":\\"68f01174-621c-4a28-9401-98e1e14b631a\\",\\"channel\\":\\"whatsapp\\",\\"provider\\":\\"ycloud\\",\\"external_message_id\\":\\"69cb32333a48151462c8f5cf\\",\\"lead_stage\\":\\"new\\",\\"created_contact\\":\\"false\\",\\"created_lead_thread\\":\\"false\\"}", "additional_kwargs": {}, "response_metadata": {}}
816	+50688928728	{"type": "ai", "content": "Calling Call_TOOL_-_catalog_search with input: {\\"query\\":\\"vasos\\",\\"limit\\":\\"5\\",\\"max_price_crc\\":\\"\\",\\"min_qty\\":\\"\\",\\"category\\":\\"\\",\\"id\\":\\"call_X1eoIDMIF74BfkYCqEsp6ucz\\"}", "tool_calls": [{"id": "call_X1eoIDMIF74BfkYCqEsp6ucz", "args": {"id": "call_X1eoIDMIF74BfkYCqEsp6ucz", "limit": "5", "query": "vasos", "min_qty": "", "category": "", "max_price_crc": ""}, "name": "Call_TOOL_-_catalog_search", "type": "tool_call"}], "additional_kwargs": {}, "response_metadata": {}, "invalid_tool_calls": []}
817	+50688928728	{"name": "Call_TOOL_-_catalog_search", "type": "tool", "content": "[{\\"found\\":true,\\"lookup_mode\\":\\"semantic\\",\\"exact_product_id\\":null,\\"result_count\\":5,\\"best_match_quality\\":\\"exact\\",\\"results\\":[{\\"id\\":\\"cups_vinyl_std\\",\\"sku\\":\\"MWL-CUP-VINYL-STD\\",\\"name\\":\\"Vasos personalizados\\",\\"category\\":\\"vasos\\",\\"family\\":\\"vasos_personalizados\\",\\"variant_label\\":\\"estandar\\",\\"size_label\\":null,\\"price_crc\\":2200,\\"price_from_crc\\":null,\\"min_qty\\":1,\\"summary\\":\\"Vasos personalizados estampados en vinil.\\",\\"details\\":null,\\"notes\\":null,\\"aliases\\":[\\"vasos\\",\\"vasos en vinil\\",\\"vasos personalizados\\"],\\"source_type\\":\\"catalog_pdf\\",\\"source_ref\\":\\"Fiestas2026.pdf\\",\\"image\\":{\\"bucket\\":\\"mwl-products\\",\\"path\\":\\"products/cups_vinyl_std/main.jpeg\\",\\"alt_text\\":\\"Vaso personalizado\\"},\\"exact_match\\":true,\\"direct_match\\":true,\\"match_quality\\":\\"exact\\",\\"score\\":10.2},{\\"id\\":\\"kit_creativo_std\\",\\"sku\\":\\"MWL-KIT-CREATIVO-STD\\",\\"name\\":\\"Kit creativo personalizado\\",\\"category\\":\\"kits\\",\\"family\\":\\"kit_creativo\\",\\"variant_label\\":\\"estandar\\",\\"size_label\\":null,\\"price_crc\\":null,\\"price_from_crc\\":4500,\\"min_qty\\":10,\\"summary\\":\\"Kit personalizado para celebraciones.\\",\\"details\\":\\"Incluye libro de colorear, vaso personalizado, bolso confitero y crayolas.\\",\\"notes\\":null,\\"aliases\\":[\\"combo creativo\\",\\"kit creativo\\",\\"kit personalizado\\"],\\"source_type\\":\\"catalog_pdf\\",\\"source_ref\\":\\"Fiestas2026.pdf\\",\\"image\\":null,\\"exact_match\\":false,\\"direct_match\\":true,\\"match_quality\\":\\"strong\\",\\"score\\":2.4},{\\"id\\":\\"bag_caminata_20x25_std\\",\\"sku\\":\\"MWL-BAG-CAM-20X25-STD\\",\\"name\\":\\"Caminata 20x25 cm Fondo Blanco\\",\\"category\\":\\"bolsos\\",\\"family\\":\\"caminata\\",\\"variant_label\\":\\"estandar\\",\\"size_label\\":\\"20x25 cm\\",\\"price_crc\\":1700,\\"price_from_crc\\":null,\\"min_qty\\":5,\\"summary\\":\\"Bolso tipo caminata en tela blanca.\\",\\"details\\":\\"Personalización temática frontal.\\",\\"notes\\":\\"Se puede incluir nombre del invitado sin costo adicional.\\",\\"aliases\\":[\\"bolso caminata\\",\\"bolso tipo caminata\\",\\"caminata\\",\\"bolso de espalda\\",\\"backpack\\",\\"bolsos tipo backpack\\",\\"mochilita\\"],\\"source_type\\":\\"owner_direct\\",\\"source_ref\\":\\"Actualizacion manual bolsos marzo 2026\\",\\"image\\":null,\\"exact_match\\":false,\\"direct_match\\":false,\\"match_quality\\":\\"strong\\",\\"score\\":2.82},{\\"id\\":\\"bag_caminata_20x25_full\\",\\"sku\\":\\"MWL-BAG-CAM-20X25-FULL\\",\\"name\\":\\"Caminata 20x25 cm Full Sublimada\\",\\"category\\":\\"bolsos\\",\\"family\\":\\"caminata\\",\\"variant_label\\":\\"premium\\",\\"size_label\\":\\"20x25 cm\\",\\"price_crc\\":2500,\\"price_from_crc\\":null,\\"min_qty\\":5,\\"summary\\":\\"Bolso tipo caminata completamente sublimado.\\",\\"details\\":\\"Parte trasera puede ser de color. Es la unica opcion totalmente colorida.\\",\\"notes\\":\\"Tiene descuento del 5% solo en pedidos mayores a 15 unidades. El agente no debe ofrecerlo si el cliente no lo pide.\\",\\"aliases\\":[\\"bolso caminata\\",\\"bolso premium caminata\\",\\"bolso tipo caminata\\",\\"caminata colorida\\",\\"caminata full sublimada\\",\\"caminata premium\\",\\"bolso de espalda\\",\\"backpack\\",\\"bolsos tipo backpack\\",\\"mochilita\\"],\\"source_type\\":\\"owner_direct\\",\\"source_ref\\":\\"Actualizacion manual bolsos marzo 2026\\",\\"image\\":{\\"bucket\\":\\"mwl-products\\",\\"path\\":\\"products/bag_caminata_20x25_full/main.jpeg\\",\\"alt_text\\":\\"Bolso tipo caminata 20x25 cm full sublimado\\"},\\"exact_match\\":false,\\"direct_match\\":false,\\"match_quality\\":\\"strong\\",\\"score\\":2.82},{\\"id\\":\\"bag_caminata_30x35_std\\",\\"sku\\":\\"MWL-BAG-CAM-30X35-STD\\",\\"name\\":\\"Caminata 30x35 cm Fondo Blanco\\",\\"category\\":\\"bolsos\\",\\"family\\":\\"caminata\\",\\"variant_label\\":\\"estandar\\",\\"size_label\\":\\"30x35 cm\\",\\"price_crc\\":1900,\\"price_from_crc\\":null,\\"min_qty\\":5,\\"summary\\":\\"Bolso tipo caminata en tela blanca.\\",\\"details\\":\\"Diseño frontal temático.\\",\\"notes\\":\\"Se puede incluir nombre sin costo adicional.\\",\\"aliases\\":[\\"bolso caminata\\",\\"bolso caminata grande\\",\\"bolso tipo caminata\\",\\"caminata grande\\",\\"bolso de espalda\\",\\"backpack\\",\\"bolsos tipo backpack\\",\\"mochilita\\"],\\"source_type\\":\\"owner_direct\\",\\"source_ref\\":\\"Actualizacion manual bolsos marzo 2026\\",\\"image\\":null,\\"exact_match\\":false,\\"direct_match\\":false,\\"match_quality\\":\\"strong\\",\\"score\\":2.57}],\\"source\\":[\\"Fiestas2026.pdf\\",\\"Actualizacion manual bolsos marzo 2026\\"],\\"notes\\":null,\\"confidence\\":0.96}]", "tool_call_id": "call_X1eoIDMIF74BfkYCqEsp6ucz", "additional_kwargs": {}, "response_metadata": {}}
818	+50688928728	{"type": "ai", "content": "{\\n  \\"reply_text\\": \\"Sí, tenemos vasos personalizados en vinil desde ₡2200 cada uno y sin mínimo de compra.\\\\n¿Querés cotizar para cuántas unidades?\\",\\n  \\"intent\\": \\"inquiry\\",\\n  \\"stage\\": \\"qualification\\",\\n  \\"confidence\\": 0.95,\\n  \\"risk_flag\\": false,\\n  \\"needs_human\\": false,\\n  \\"human_handoff\\": null,\\n  \\"actions\\": [],\\n  \\"selected_catalog_image_ref\\": null\\n}", "tool_calls": [], "additional_kwargs": {}, "response_metadata": {}, "invalid_tool_calls": []}
819	+50688928728	{"type": "human", "content": "{\\"mensaje\\":\\"10\\",\\"ChatID\\":\\"+50688928728\\",\\"NombreCliente\\":\\"Carlos Mata\\",\\"lead_thread_key\\":\\"+50688928728\\",\\"lead_thread_id\\":\\"68f01174-621c-4a28-9401-98e1e14b631a\\",\\"channel\\":\\"whatsapp\\",\\"provider\\":\\"ycloud\\",\\"external_message_id\\":\\"69cb3257992110109d72ffbe\\",\\"lead_stage\\":\\"new\\",\\"created_contact\\":\\"false\\",\\"created_lead_thread\\":\\"false\\"}", "additional_kwargs": {}, "response_metadata": {}}
820	+50688928728	{"type": "ai", "content": "Calling Call_TOOL_-_sales_upsert_order_context_ with input: {\\"operation\\":\\"upsert_order_context\\",\\"lead_thread_id\\":\\"68f01174-621c-4a28-9401-98e1e14b631a\\",\\"currency\\":\\"CRC\\",\\"source\\":\\"nova\\",\\"notes\\":\\"\\",\\"product_id\\":\\"cups_vinyl_std\\",\\"product_name_snapshot\\":\\"Vasos personalizados\\",\\"sku_snapshot\\":\\"MWL-CUP-VINYL-STD\\",\\"quantity\\":\\"10\\",\\"unit_price_crc\\":\\"2200\\",\\"theme\\":\\"\\",\\"event_date\\":\\"\\",\\"item_notes\\":\\"\\",\\"id\\":\\"call_SxZUSlzB3Fv0epVSKribl628\\"}", "tool_calls": [{"id": "call_SxZUSlzB3Fv0epVSKribl628", "args": {"id": "call_SxZUSlzB3Fv0epVSKribl628", "notes": "", "theme": "", "source": "nova", "currency": "CRC", "quantity": "10", "operation": "upsert_order_context", "event_date": "", "item_notes": "", "product_id": "cups_vinyl_std", "sku_snapshot": "MWL-CUP-VINYL-STD", "lead_thread_id": "68f01174-621c-4a28-9401-98e1e14b631a", "unit_price_crc": "2200", "product_name_snapshot": "Vasos personalizados"}, "name": "Call_TOOL_-_sales_upsert_order_context_", "type": "tool_call"}], "additional_kwargs": {}, "response_metadata": {}, "invalid_tool_calls": []}
821	+50688928728	{"name": "Call_TOOL_-_sales_upsert_order_context_", "type": "tool", "content": "[{\\"success\\":true,\\"operation\\":\\"upsert_order_context\\",\\"order_id\\":\\"5ecf3af5-bf0d-40d6-b9bc-77cf8cec5a11\\",\\"lead_thread_id\\":\\"68f01174-621c-4a28-9401-98e1e14b631a\\",\\"status\\":\\"draft\\",\\"payment_status\\":\\"pending_validation\\",\\"currency\\":\\"CRC\\",\\"subtotal_crc\\":22000,\\"total_crc\\":22000,\\"item_count\\":1,\\"message\\":\\"Order context upserted successfully\\"}]", "tool_call_id": "call_SxZUSlzB3Fv0epVSKribl628", "additional_kwargs": {}, "response_metadata": {}}
822	+50688928728	{"type": "ai", "content": "{\\n  \\"reply_text\\": \\"Perfecto, los vasos personalizados se pueden diseñar con la temática que quieras.\\\\n¿Qué temática querés para los vasos?\\",\\n  \\"intent\\": \\"qualification\\",\\n  \\"stage\\": \\"qualification\\",\\n  \\"confidence\\": 0.95,\\n  \\"risk_flag\\": false,\\n  \\"needs_human\\": false,\\n  \\"human_handoff\\": null,\\n  \\"actions\\": [],\\n  \\"selected_catalog_image_ref\\": null\\n}", "tool_calls": [], "additional_kwargs": {}, "response_metadata": {}, "invalid_tool_calls": []}
837	+50688928728	{"type": "human", "content": "{\\"mensaje\\":\\"Cliente envio una imagen de comprobante de pago. Banco detectado: BAC. Tipo: SINPE Móvil. Monto detectado: ₡9,000.00. Remitente: SANDRA VERONICA AGUILAR GALDAMEZ. Destinatario: KAROL ANDREA BOLAÑOS MENESES. Telefono destino: 88131053. FechaComprobante: 27 febrero 2026. HoraComprobante: 2:17 PM. ConceptoComprobante: Bolsitas de confites. El cliente aparentemente envio el comprobante del adelanto.\\",\\"ChatID\\":\\"+50688928728\\",\\"NombreCliente\\":\\"Carlos Mata\\",\\"lead_thread_key\\":\\"+50688928728\\",\\"lead_thread_id\\":\\"68f01174-621c-4a28-9401-98e1e14b631a\\",\\"channel\\":\\"whatsapp\\",\\"provider\\":\\"ycloud\\",\\"external_message_id\\":\\"69cb4ba53a48151462cda978\\",\\"lead_stage\\":\\"new\\",\\"created_contact\\":\\"false\\",\\"created_lead_thread\\":\\"false\\"}", "additional_kwargs": {}, "response_metadata": {}}
838	+50688928728	{"type": "ai", "content": "Calling Call_TOOL_-_sales_upsert_order_context_ with input: {\\"operation\\":\\"upsert_order_context\\",\\"lead_thread_id\\":\\"68f01174-621c-4a28-9401-98e1e14b631a\\",\\"currency\\":\\"CRC\\",\\"source\\":\\"nova\\",\\"notes\\":\\"\\",\\"product_id\\":\\"cups_vinyl_std\\",\\"product_name_snapshot\\":\\"Vasos personalizados\\",\\"sku_snapshot\\":\\"MWL-CUP-VINYL-STD\\",\\"quantity\\":\\"10\\",\\"unit_price_crc\\":\\"2200\\",\\"theme\\":\\"Batman\\",\\"event_date\\":\\"2024-06-20\\",\\"item_notes\\":\\"\\",\\"id\\":\\"call_yuwcnd6Rjo9lARJlrojcspbP\\"}", "tool_calls": [{"id": "call_yuwcnd6Rjo9lARJlrojcspbP", "args": {"id": "call_yuwcnd6Rjo9lARJlrojcspbP", "notes": "", "theme": "Batman", "source": "nova", "currency": "CRC", "quantity": "10", "operation": "upsert_order_context", "event_date": "2024-06-20", "item_notes": "", "product_id": "cups_vinyl_std", "sku_snapshot": "MWL-CUP-VINYL-STD", "lead_thread_id": "68f01174-621c-4a28-9401-98e1e14b631a", "unit_price_crc": "2200", "product_name_snapshot": "Vasos personalizados"}, "name": "Call_TOOL_-_sales_upsert_order_context_", "type": "tool_call"}], "additional_kwargs": {}, "response_metadata": {}, "invalid_tool_calls": []}
842	+50688928728	{"type": "ai", "content": "{\\n  \\"reply_text\\": \\"Ya recibí el comprobante 😊\\\\nVoy a validarlo para continuar con tu pedido.\\",\\n  \\"intent\\": \\"human_request\\",\\n  \\"stage\\": \\"close\\",\\n  \\"confidence\\": 0.98,\\n  \\"risk_flag\\": false,\\n  \\"needs_human\\": true,\\n  \\"human_handoff\\": {\\n    \\"tipo\\": \\"payment_receipt_review\\",\\n    \\"cliente_nombre\\": \\"Carlos Mata\\",\\n    \\"cliente_telefono\\": \\"+50688928728\\",\\n    \\"mensaje_cliente\\": \\"Cliente envio una imagen de comprobante de pago. Banco detectado: BAC. Tipo: SINPE Móvil. Monto detectado: ₡9,000.00. Remitente: SANDRA VERONICA AGUILAR GALDAMEZ. Destinatario: KAROL ANDREA BOLAÑOS MENESES. Telefono destino: 88131053. FechaComprobante: 27 febrero 2026. HoraComprobante: 2:17 PM. ConceptoComprobante: Bolsitas de confites. El cliente aparentemente envio el comprobante del adelanto.\\",\\n    \\"motivo\\": \\"posible comprobante de pago recibido para validación\\",\\n    \\"pedido\\": {\\n      \\"producto\\": \\"Vasos personalizados\\",\\n      \\"cantidad\\": \\"10\\",\\n      \\"tematica\\": \\"Batman\\",\\n      \\"fecha_evento\\": \\"2024-06-20\\"\\n    },\\n    \\"comprobante\\": {\\n      \\"banco\\": \\"BAC\\",\\n      \\"tipo_transferencia\\": \\"SINPE Móvil\\",\\n      \\"monto_texto\\": \\"₡9,000.00\\",\\n      \\"moneda\\": \\"CRC\\",\\n      \\"referencia\\": \\"\\",\\n      \\"remitente\\": \\"SANDRA VERONICA AGUILAR GALDAMEZ\\",\\n      \\"destinatario\\": \\"KAROL ANDREA BOLAÑOS MENESES\\",\\n      \\"telefono_destino\\": \\"88131053\\",\\n      \\"fecha\\": \\"2026-02-27\\",\\n      \\"hora\\": \\"14:17\\"\\n    }\\n  },\\n  \\"actions\\": [\\n    \\"tag_contact:AgenteIA_Disable\\",\\n    \\"tag_contact:Posible_Comprobante\\",\\n    \\"notify:Karol\\"\\n  ],\\n  \\"selected_catalog_image_ref\\": null\\n}", "tool_calls": [], "additional_kwargs": {}, "response_metadata": {}, "invalid_tool_calls": []}
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."orders" ("id", "lead_thread_id", "status_legacy", "payment_status", "currency", "subtotal_crc", "total_crc", "source", "notes", "created_at", "updated_at", "contact_id", "status", "delivery_date") FROM stdin;
8a49360d-9a47-46bf-b045-3e75c68644b7	68f01174-621c-4a28-9401-98e1e14b631a	pending_payment	pending_validation	CRC	19650	19650	CRM	\N	2026-04-01 04:20:24.604+00	2026-04-01 15:10:40.835311+00	380b34f3-8a87-4455-8dec-1e31570403fa	pending_payment	\N
d96a8f38-c38b-489e-80b3-b63f8bcb4560	68f01174-621c-4a28-9401-98e1e14b631a	draft	validated	CRC	36900	36900	nova	null	2026-03-26 03:47:39.162961+00	2026-04-01 21:20:23.300855+00	380b34f3-8a87-4455-8dec-1e31570403fa	in_production	2026-04-20
8e5e6151-04fc-4c84-a566-e396580ec032	68f01174-621c-4a28-9401-98e1e14b631a	pending_payment	pending_validation	CRC	3200	3200	CRM	\N	2026-04-02 02:39:52.327+00	2026-04-02 02:40:29.064738+00	380b34f3-8a87-4455-8dec-1e31570403fa	pending_payment	\N
5ecf3af5-bf0d-40d6-b9bc-77cf8cec5a11	68f01174-621c-4a28-9401-98e1e14b631a	draft	validated	CRC	22000	22000	nova	\N	2026-03-31 02:33:10.07105+00	2026-04-03 03:44:28.42556+00	380b34f3-8a87-4455-8dec-1e31570403fa	in_production	2026-04-20
\.


--
-- Data for Name: order_activity; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."order_activity" ("id", "order_id", "type", "content", "metadata", "created_at", "created_by") FROM stdin;
5d3eb719-aee7-4de1-b1eb-06dd1b7264d3	8a49360d-9a47-46bf-b045-3e75c68644b7	note	nota de prueba ahora editada	\N	2026-04-02 06:43:24.6+00	\N
f9607221-e710-42ad-a62f-3696b3bc4540	5ecf3af5-bf0d-40d6-b9bc-77cf8cec5a11	payment_validation	Payment receipt validated.	{"status": "validated", "receiptId": "4f88d614-b2d7-419e-b4ab-3fec933284dc", "validatedBy": "CRM"}	2026-04-03 03:44:28.535+00	CRM
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."order_items" ("id", "order_id", "product_id", "quantity", "unit_price_crc", "total_price_crc", "product_name_snapshot", "sku_snapshot", "theme", "delivery_date", "created_at", "item_notes") FROM stdin;
3	5ecf3af5-bf0d-40d6-b9bc-77cf8cec5a11	cups_vinyl_std	10	2200	22000	Vasos personalizados	MWL-CUP-VINYL-STD	Batman	2026-06-20	2026-03-31 02:33:10.166659+00	\N
2	d96a8f38-c38b-489e-80b3-b63f8bcb4560	bag_caminata_20x25_full	12	2375	28500	Caminata 20x25 cm Full Sublimada	MWL-BAG-CAM-20X25-FULL	\N	2026-04-02	2026-03-29 04:30:08.934122+00	\N
5	d96a8f38-c38b-489e-80b3-b63f8bcb4560	pillow_coloring_20x20	3	2800	8400	Almohadón para colorear 20x20 cm	MWL-PILLOW-COLOR-20X20	\N	\N	2026-04-01 02:16:02.084+00	\N
6	8a49360d-9a47-46bf-b045-3e75c68644b7	book_coloring_std	5	1600	8000	Libro para colorear personalizado	MWL-BOOK-COLORING-STD	\N	\N	2026-04-01 04:20:24.77+00	\N
7	8a49360d-9a47-46bf-b045-3e75c68644b7	candy_box_relieve_15_6x7_5x11	5	1450	7250	Candy Box relieve 15.6x7.5x11 cm	MWL-CB-RELIEVE-15.6X7.5X11	\N	\N	2026-04-01 04:20:24.77+00	\N
8	8a49360d-9a47-46bf-b045-3e75c68644b7	clear_bag_22x7x17	2	2200	4400	Clear Bag 22x7x17 cm	MWL-CLEAR-BAG-22X7X17	\N	\N	2026-04-01 15:10:40.862+00	\N
11	d96a8f38-c38b-489e-80b3-b63f8bcb4560	cups_vinyl_std	5	2200	11000	Vasos personalizados	MWL-CUP-VINYL-STD	Batman	2026-04-20	2026-04-01 21:23:07.882946+00	\N
12	d96a8f38-c38b-489e-80b3-b63f8bcb4560	bag_confitero_20x25_std	3	1000	3000	Confitero 20x25 cm	MWL-BAG-CONF-20X25-STD	Batman	2026-04-22	2026-04-01 21:23:47.826561+00	Entrega separada
13	8e5e6151-04fc-4c84-a566-e396580ec032	book_coloring_std	2	1600	3200	Libro para colorear personalizado	MWL-BOOK-COLORING-STD	\N	\N	2026-04-02 02:39:52.499+00	\N
\.


--
-- Data for Name: payment_receipts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."payment_receipts" ("id", "order_id", "message_id", "receipt_key", "status", "bank", "transfer_type", "amount_text", "currency", "reference", "sender_name", "recipient_name", "destination_phone", "receipt_date", "receipt_time", "created_at", "updated_at", "raw_payload", "amount_crc", "source", "internal_notes", "validated_at", "validated_by", "deleted_at", "deleted_by", "bank_id") FROM stdin;
4f88d614-b2d7-419e-b4ab-3fec933284dc	5ecf3af5-bf0d-40d6-b9bc-77cf8cec5a11	\N	ycloud:69cb4ba53a48151462cda978	validated	BAC	SINPE Móvil	₡9,000.00	CRC	\N	SANDRA VERONICA AGUILAR GALDAMEZ	KAROL ANDREA BOLAÑOS MENESES	88131053	2026-02-27	14:17	2026-03-31 04:34:01.546918+00	2026-04-03 03:44:28.42556+00	{}	9000	automation	\N	2026-04-03 03:44:28.442+00	CRM	\N	\N	\N
\.


--
-- Data for Name: processed_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."processed_events" ("id", "provider", "external_event_id", "external_message_id", "cw_message_id", "processed_at") FROM stdin;
\.


--
-- Data for Name: state_changes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."state_changes" ("id", "lead_thread_id", "from_state", "to_state", "reason", "event_ref", "created_at") FROM stdin;
\.


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."buckets" ("id", "name", "owner", "created_at", "updated_at", "public", "avif_autodetection", "file_size_limit", "allowed_mime_types", "owner_id", "type") FROM stdin;
mwl-products	mwl-products	\N	2026-03-07 22:00:47.750662+00	2026-03-07 22:00:47.750662+00	t	f	5242880	{image/jpeg,image/png,image/webp}	\N	STANDARD
\.


--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."buckets_analytics" ("name", "type", "format", "created_at", "updated_at", "id", "deleted_at") FROM stdin;
\.


--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."buckets_vectors" ("id", "type", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."objects" ("id", "bucket_id", "name", "owner", "created_at", "updated_at", "last_accessed_at", "metadata", "version", "owner_id", "user_metadata") FROM stdin;
1ebf3c4a-9419-4592-8b78-08de64dd9826	mwl-products	products/bag_confitero_20x25_std/main.jpeg	\N	2026-03-08 00:49:48.588798+00	2026-03-08 00:49:48.588798+00	2026-03-08 00:49:48.588798+00	{"eTag": "\\"6a1d987c818b616986739f1a73cc53a5-1\\"", "size": 183683, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-03-08T00:49:49.000Z", "contentLength": 183683, "httpStatusCode": 200}	78c77d3f-3806-460a-84e8-fa08f65bf7ba	\N	\N
342c9a40-2c78-4aee-8ce1-06eed13f703d	mwl-products	products/bag_caminata_20x25_full/main.jpeg	\N	2026-03-08 01:02:07.767485+00	2026-03-08 01:02:07.767485+00	2026-03-08 01:02:07.767485+00	{"eTag": "\\"73a1b65652e7d8739288884d16a3a80d-1\\"", "size": 184602, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-03-08T01:02:08.000Z", "contentLength": 184602, "httpStatusCode": 200}	0ac50191-554a-479c-828d-3a9a8d1ce863	\N	\N
4d87fb5b-7d83-4b28-9f66-21a68688c293	mwl-products	products/cups_vinyl_std/main.jpeg	\N	2026-03-08 01:06:19.519568+00	2026-03-08 01:06:19.519568+00	2026-03-08 01:06:19.519568+00	{"eTag": "\\"b74bd245ab4cf26e5e0a3ab87e631564-1\\"", "size": 146808, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-03-08T01:06:19.000Z", "contentLength": 146808, "httpStatusCode": 200}	b5ec4639-6b02-4d84-a24c-67d4e5dbc0e0	\N	\N
\.


--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."s3_multipart_uploads" ("id", "in_progress_size", "upload_signature", "bucket_id", "key", "version", "owner_id", "created_at", "user_metadata", "metadata") FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."s3_multipart_uploads_parts" ("id", "upload_id", "size", "part_number", "bucket_id", "key", "etag", "owner_id", "version", "created_at") FROM stdin;
\.


--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."vector_indexes" ("id", "name", "bucket_id", "data_type", "dimension", "distance_metric", "metadata_configuration", "created_at", "updated_at") FROM stdin;
\.


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 1, false);


--
-- Name: mwl_discount_rules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."mwl_discount_rules_id_seq"', 1, true);


--
-- Name: mwl_product_aliases_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."mwl_product_aliases_id_seq"', 50, true);


--
-- Name: mwl_product_images_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."mwl_product_images_id_seq"', 6, true);


--
-- Name: mwl_product_search_terms_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."mwl_product_search_terms_id_seq"', 62, true);


--
-- Name: mwl_search_feedback_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."mwl_search_feedback_id_seq"', 30, true);


--
-- Name: mwl_search_synonyms_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."mwl_search_synonyms_id_seq"', 34, true);


--
-- Name: n8n_chat_histories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."n8n_chat_histories_id_seq"', 842, true);


--
-- Name: order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."order_items_id_seq"', 13, true);


--
-- PostgreSQL database dump complete
--

-- \unrestrict tMWt94PnClgl4ljuPDIeOhbaSHUhqJ5gc1m1eN25sJpNnbQycWt9nsd3Th5jCg8

RESET ALL;

SET default_transaction_read_only = off;

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

ALTER ROLE "anon" SET "statement_timeout" TO '3s';

ALTER ROLE "authenticated" SET "statement_timeout" TO '8s';

ALTER ROLE "authenticator" SET "statement_timeout" TO '8s';

RESET ALL;



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


CREATE OR REPLACE VIEW "public"."campaign_kpi_extended" AS
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


CREATE OR REPLACE VIEW "public"."campaign_lead_quality" AS
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



































