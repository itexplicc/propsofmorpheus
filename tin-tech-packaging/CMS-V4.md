# Tin Tech Packaging V4 Content Management

Tin Tech V4 adds a structured website content system to the existing product and inquiry administration.

## Admin sections

- **Website content** manages hero slides, brand identity, logo, contact details, header, footer, homepage, company page, capabilities, portfolio wording, product-page wording, contact form and page SEO.
- **Media & factory** manages the wide factory image, its height and focal position, plus the legacy fallback hero image.
- **Products** manages product data, general images and selectable color/print/finish/style galleries.
- **Categories** and **Inquiries** retain their existing behavior.

## Publishing model

Website text and hero slides are edited as structured fields and published together through **Publish website changes**. The public pages retain built-in defaults if the content API is unavailable or a field is left absent. Images upload to the existing Tin Tech media bucket.

## Backend

- `tintech_site_content` stores the published structured website content.
- `tintech_hero_slides` stores ordered slideshow records.
- The existing `tintech_site_settings` table continues to store factory media layout and the legacy fallback hero.
- The existing product, variant, category, inquiry, password-session and upload systems remain intact.
