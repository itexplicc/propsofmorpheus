# Hi-Line Auto Sales & Investment System

A simple vehicle showroom and admin portal built for Sri Lankan vehicle trading.

## Public website
- Browse all published vehicles
- Search and filter by type, make and status
- Share a direct link to one vehicle
- Multiple photos and videos
- Call, WhatsApp, enquiry, test-drive and offer actions
- Sold vehicles remain visible for a chosen number of days

## Admin portal
Password-only login. Default password: `Caradmin`

- Add and edit any vehicle type
- Reuse saved make/model/variant values
- Upload multiple photos and videos
- Track enquiries, offers and negotiation stages
- Record purchase price and every additional cost
- Attach invoices and receipts
- Record investor contributions per vehicle
- Record final sale price
- Automatically calculate total cost, profit, investment percentage, profit share and payout
- Control statuses: bought, importing, repair, ready, displayed, reserved, in use, sold and archived

## Architecture
- Static responsive frontend suitable for GitHub Pages
- Supabase Edge Function as the only data API
- PostgreSQL with RLS enabled and direct browser access revoked
- Public Storage bucket for vehicle media
- Private Storage bucket for invoices
- Custom expiring admin sessions with login rate limiting

All database objects use the `hla_` prefix to stay isolated from other systems in the Supabase project.
