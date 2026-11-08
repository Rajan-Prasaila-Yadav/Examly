# Batch directory and create/edit flow

Implemented responsive table/cards, institute and status filters, debounced search,
real counts, loading/error/empty states, and a full-page create/edit form.
The form requires an explicit free/paid selection, retains input
on failure, and supports optional dates including clearing previously saved dates.

API accepts `priceNpr` and the legacy `price` field, rejects conflicting amounts,
validates institute ownership and date order, and prevents changing a batch's
institute. `/api/v1/batches/options` supplies active institutes and create/update
capabilities using the current server permission rules. List requests have no
module-global cache and bypass the shared GET cache; mutations invalidate batch
queries. The batch endpoints use PostgreSQL directly, not Redis.

## Database deployment

Apply `database/sql/batch-code-uniqueness.sql` alongside this change. It has been
applied to the configured development database after confirming no duplicates.
The partial unique index rejects case-insensitive duplicate codes within an
institute, excluding soft-deleted records. It is not represented by Prisma's
schema; preserve it during schema synchronization and apply it in other environments.

## Verification

- API and web TypeScript checks passed.
- `node scripts/verify-batch-flow.cjs` passed against the local API and configured
  database: authenticated creation, fee persistence, editing, date clearing,
  fresh detail/list reads, filtering, duplicate/invalid input rejection, and
  institute guards. Its disposable batch was removed in cleanup.
- Browser checked with an institute-admin session at desktop and 390px phone
  widths: live list, create validation, edit hydration, dialog focus and cancel.
- Existing global repository diff check reports an unrelated blank line at EOF
  in catalog.prisma; that pre-existing file was not changed in this slice.

## Remaining slices

Visibility and confirmed soft deletion are now connected and verified. Recovery,
batch reorder, enrollment, curriculum details and teacher assignments remain
separate work. This is not a claim that the wider batch-detail page or its
child APIs have been fully repaired. Hosted Redis is currently unresolved; this
does not participate in the implemented batch CRUD path.

## Prototype adoption (2026-11-08)

Read the supplied Examly CBT Design Prototype HTML and End-to-End Build Plan.
Applied its purple palette, Plus Jakarta Sans typography, rounded white shell,
sidebar, breadcrumbs, pill controls, table/card layouts and full-page batch form.
The sidebar supports collapse, resize and saved width; the shell supports light
and dark themes. Menus and signed-in role use real authentication permissions.

Added fee filtering, sorting, pagination, selection and server-generated XLSX/PDF
exports. Export reuses the authenticated, tenant-scoped list and intersects
selected IDs with accessible records. Counts come from database relationships;
teacher counts display an em dash because batch-specific assignments are absent.
No prototype fixture rows or fake role-switch permissions were introduced.

The integration script additionally passed XLSX cell contents, PDF signature,
visibility persistence and soft deletion. All disposable verification rows were
removed. Desktop, mobile (390px), table/cards, filters, create form and theme
switching were inspected in the running app. Exact pixel comparison remains
unverified: browser policy blocked the local HTML reference, so its source CSS
and markup were used. The image uploader validates local files and calls the
existing presigned-upload API, but a real cloud upload was not verified.

This step covers the shared shell and batch directory/form. Prototype-wide
library restructuring, detail tabs, timetable, OTP, notification inbox and other
modules remain separate phases; existing pages retain their existing content.
