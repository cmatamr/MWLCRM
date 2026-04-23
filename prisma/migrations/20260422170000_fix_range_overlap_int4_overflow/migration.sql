CREATE OR REPLACE FUNCTION "public"."validate_product_range_prices"() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.range_min_qty <= 0 THEN
        RAISE EXCEPTION 'range_min_qty must be greater than 0';
    END IF;

    IF NEW.unit_price_crc <= 0 THEN
        RAISE EXCEPTION 'unit_price_crc must be greater than 0';
    END IF;

    IF NEW.range_max_qty IS NOT NULL AND NEW.range_max_qty < NEW.range_min_qty THEN
        RAISE EXCEPTION 'range_max_qty must be greater than or equal to range_min_qty';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.mwl_products p
        WHERE p.id = NEW.product_id
    ) THEN
        RAISE EXCEPTION 'Producto no encontrado';
    END IF;

    IF NEW.is_active THEN
        IF EXISTS (
            SELECT 1
            FROM public.mwl_product_range_prices r
            WHERE r.product_id = NEW.product_id
              AND r.is_active = true
              AND r.id <> COALESCE(NEW.id, 0)
              AND NOT (
                  COALESCE(r.range_max_qty, 2147483647) < NEW.range_min_qty
                  OR COALESCE(NEW.range_max_qty, 2147483647) < r.range_min_qty
              )
        ) THEN
            RAISE EXCEPTION 'Rangos estructurales solapados';
        END IF;

        IF NEW.range_max_qty IS NULL AND EXISTS (
            SELECT 1
            FROM public.mwl_product_range_prices r
            WHERE r.product_id = NEW.product_id
              AND r.is_active = true
              AND r.id <> COALESCE(NEW.id, 0)
              AND r.range_max_qty IS NULL
        ) THEN
            RAISE EXCEPTION 'Solo se permite un rango abierto activo por producto';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;
