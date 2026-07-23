# Tin Tech Packaging backend

The Tin Tech v2 website uses the connected Supabase project `zadxvmpgngwtpsmdkcod`.

## Services

- PostgreSQL tables for categories, products, product images, inquiries, admin sessions and login-attempt throttling.
- Public Storage bucket `tintech-products` for product images.
- Edge Function `tin-tech-api` for the public catalog, inquiry submission, password-only admin sessions, product/category management, image uploads and inquiry status updates.

## Admin access

The public admin route is `/tin-tech-packaging/admin/`. The shared password is configured server-side. Sessions expire after 12 hours and failed logins are rate-limited.

## Public API

The front end calls:

`https://zadxvmpgngwtpsmdkcod.supabase.co/functions/v1/tin-tech-api`

The function was deployed with JWT verification disabled because it implements its own password session for admin actions. Database tables have row-level security enabled and are accessed by the function using the server-side service role.

## Deployment scope

The GitHub Pages workflow publishes only the company pages, admin interface, shared assets and official logos. This backend note and older unused Tin Tech files are not copied to the public Pages artifact.
