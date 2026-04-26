# Product Image Manual Test Plan

Scope: secure product image management in `mwl-products` (private bucket), using only:
- `GET /api/products/[id]/images`
- `POST /api/products/[id]/images`
- `DELETE /api/products/[id]/images/[imageId]`

Preconditions:
- Authenticated admin user
- Existing product id for tests
- Supabase bucket `mwl-products` configured as private

## A) First upload without existing main
1. Pick product with no rows in `mwl_product_images`.
2. Upload valid JPG/PNG/WEBP via Multimedia tab.
3. Verify DB:
   - One row for product
   - `storage_path = products/{product_id}/main.webp`
   - `is_primary = true`
   - `sort_order = 0`
4. Verify GET images returns signed URL for row.

Expected:
- Upload succeeds.
- Primary image is `main.webp`.

## B) Secondary upload
1. Product already has `main.webp`.
2. Upload valid file with `mark_as_primary = false`.
3. Verify DB new row:
   - `storage_path = products/{product_id}/{product_id}_{n}.webp`
   - `is_primary = false`
   - `sort_order > 0`
4. Verify only one primary remains.

Expected:
- New image stored as serial.
- Existing main preserved.

## C) Replace main (`mark_as_primary = true`)
1. Product has existing main and at least zero/one secondaries.
2. Upload valid file with `mark_as_primary = true`.
3. Verify:
   - Previous main moved to next serial path.
   - New file stored as `main.webp`.
   - DB has exactly one primary.

Expected:
- Atomic business result from user perspective.
- No duplicate primary.

## D) Delete secondary
1. Delete non-primary image.
2. Verify storage object deleted.
3. Verify DB row deleted.
4. Verify primary unchanged.

Expected:
- Secondary removed cleanly.

## E) Delete main with promotion
1. Product has main + at least one secondary.
2. Delete current primary.
3. Verify:
   - Candidate secondary promoted to `main.webp` in Storage and DB.
   - Promoted row `is_primary = true`, `sort_order = 0`.
   - Remaining images `is_primary = false`.

Expected:
- Exactly one primary after operation.

## F) Invalid file type
1. Try upload `svg`, `gif`, `pdf`, or random binary renamed.

Expected:
- Request rejected with controlled 4xx error.
- No DB row added.
- No storage write.

## G) File larger than 3MB
1. Upload >3MB file.

Expected:
- Request rejected with controlled 4xx error.
- No DB row added.
- No storage write.

## H) User without permission
1. Call endpoints as non-admin authenticated user.

Expected:
- 403 forbidden.
- No side effects in DB/Storage.

## Extra consistency checks
After C and E, verify:
- At most one `is_primary = true` per product.
- If primary exists, its path is `products/{product_id}/main.webp`.
- If Storage contains `main.webp`, DB points to it as primary.
