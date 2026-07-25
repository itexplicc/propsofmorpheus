# Hi-Line Auto Sales & Investment System

A simple, mobile-first vehicle showroom and admin portal for Sri Lankan vehicle trading, local buying and selling, and imports.

## Live links

- Public website: https://itexplicc.github.io/propsofmorpheus/hi-line-auto/
- Admin portal: https://itexplicc.github.io/propsofmorpheus/hi-line-auto/admin.html
- Admin login: password only; no username

## Public website

- Browse published vehicles of any type
- Search and filter by type, make and availability
- Open and share a direct vehicle link
- Multiple photos and videos
- Call, WhatsApp, enquiry, inspection and offer actions
- Sold vehicles remain visible for a selected number of days

## Simple admin workflow

1. Add or open a vehicle.
2. Save its details and selling price.
3. Upload photos and videos.
4. Add costs and attach invoices.
5. Add investors and their amounts.
6. Follow enquiries and offers.
7. Mark the vehicle sold and review automatic profit sharing.

## Financial system

For every vehicle, the system records:

- purchase price
- repairs, service, detailing, marketing, transport, duties, commissions and other costs
- private invoice and receipt files
- investor contributions
- total cost and funding balance
- final selling price and deductions
- net profit
- each investor's percentage, capital return, profit share and total payout

## Architecture and security

- Static responsive frontend published through GitHub Pages
- Dedicated Supabase project: `Car-business`
- Secured `hiline-api` Edge Function for public and admin operations
- PostgreSQL tables with Row Level Security
- Direct browser access blocked for costs, investors, invoices, sales, enquiries and admin sessions
- Public storage for vehicle media and private storage for invoices
- Password checked only on the server
- Expiring hashed admin sessions
- Login and enquiry rate limiting

The Hi-Line Auto files are isolated under this folder and the Pages workflow copies them into a separate `/hi-line-auto/` website path without changing the Tin Tech or MAKO sites.
