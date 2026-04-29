CREATE OR REPLACE FUNCTION public.toggle_client_agent_with_event(
  p_client_code text,
  p_agent_code text,
  p_enabled boolean,
  p_actor_user_id uuid,
  p_actor_email text,
  p_actor_name text,
  p_source text DEFAULT 'dashboard'
)
RETURNS TABLE(enabled boolean)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, auth
AS $$
DECLARE
  v_client_id uuid;
  v_agent_id uuid;
  v_old_enabled boolean;
  v_actor_label text;
  v_agent_label text;
BEGIN
  SELECT c.id
    INTO v_client_id
  FROM public.clients c
  WHERE c.code = p_client_code;

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'CLIENT_NOT_FOUND';
  END IF;

  SELECT a.id
    INTO v_agent_id
  FROM public.agents a
  WHERE a.code = p_agent_code;

  IF v_agent_id IS NULL THEN
    RAISE EXCEPTION 'AGENT_NOT_FOUND';
  END IF;

  SELECT ca.enabled
    INTO v_old_enabled
  FROM public.client_agents ca
  WHERE ca.client_id = v_client_id
    AND ca.agent_id = v_agent_id
  FOR UPDATE;

  IF v_old_enabled IS NULL THEN
    RAISE EXCEPTION 'CLIENT_AGENT_NOT_FOUND';
  END IF;

  IF v_old_enabled IS DISTINCT FROM p_enabled THEN
    UPDATE public.client_agents
    SET enabled = p_enabled,
        updated_by = p_actor_user_id,
        updated_by_email = p_actor_email,
        updated_by_name = p_actor_name
    WHERE client_id = v_client_id
      AND agent_id = v_agent_id;

    v_actor_label := COALESCE(NULLIF(TRIM(p_actor_name), ''), NULLIF(TRIM(p_actor_email), ''), 'usuario');
    v_agent_label := UPPER(p_agent_code);

    INSERT INTO public.client_activity_events (
      client_id,
      actor_user_id,
      actor_email,
      actor_name,
      entity_type,
      entity_id,
      event_type,
      title,
      description,
      old_values,
      new_values,
      source,
      metadata
    ) VALUES (
      v_client_id,
      p_actor_user_id,
      p_actor_email,
      p_actor_name,
      'agent',
      v_agent_id,
      CASE WHEN p_enabled THEN 'enabled' ELSE 'disabled' END,
      CASE WHEN p_enabled THEN v_agent_label || ' encendida' ELSE v_agent_label || ' apagada' END,
      CASE
        WHEN p_enabled THEN v_agent_label || ' fue encendida por el usuario ' || v_actor_label
        ELSE v_agent_label || ' fue apagada por el usuario ' || v_actor_label
      END,
      jsonb_build_object('enabled', v_old_enabled),
      jsonb_build_object('enabled', p_enabled),
      p_source,
      jsonb_build_object('clientCode', p_client_code, 'agentCode', p_agent_code)
    );
  END IF;

  RETURN QUERY SELECT p_enabled;
END;
$$;
