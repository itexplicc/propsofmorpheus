# Quranic Arabic for Young Hearts

A complete interactive learning platform for the 27 Arabic letters and 54 Qur’anic Arabic words in the original book.

## What is included

- Child-friendly public storybook experience
- Harakat-tolerant Arabic search, random discovery, saved learning progress, and keyboard navigation
- Full lesson guides, activity steps, stories, Qur’an connections, duas, and wrap-ups
- Community experience submissions with optional images, videos, or PDFs
- Protected educator studio for content editing and moderation
- Book, letter, or word-level audio upload and publishing
- Experience approval, rejection, editing, attachment removal, and permanent deletion
- Adjustable public letter-card sizing controlled by administrators
- Supabase Database, Auth, Storage, Row Level Security, and protected Edge Functions
- Packaged fallback curriculum for public reading when the data service is temporarily unavailable

## Live pages

- `index.html` — public learning experience
- `admin.html` — protected educator studio
- `assets/` — split production CSS and JavaScript loaded by validated loaders
- `data/` — portable curriculum copy and fallback content
- `supabase/` — schema, seed data, and Edge Function source

## Administrator access

The public studio login asks only for the shared QAJ admin password. The password is **not stored in the website source**. It is verified by the `qaj-yh-admin-login` Supabase Edge Function, which returns a short-lived authentication token for the approved QAJ administrator account.

This is different from a browser-only password hash. Do not replace the current login with a hard-coded password or public SHA-256 hash.

## Publishing model

All real content changes publish through authenticated Supabase writes protected by Row Level Security. The live website does not treat browser-local edits as the source of truth.

Local browser storage is used only for harmless visitor state such as explored words and the last opened word. It must not replace cloud publishing for curriculum, audio, moderation, or settings.

## Search

Arabic search removes harakat and tatweel and normalizes common letter variants. For example, typing `قمر` can find `قَمَرٌ`.

## Audio

The public song section remains hidden until an administrator uploads and publishes a book-level audio track. Supported formats include MP3, M4A/MP4 audio, WAV, OGG, and WebM audio.

## Card sizing

Open **Site Settings** in the educator studio and adjust **Letter card size**. The value is stored as the public `card_scale` setting in Supabase and is applied automatically to the public book.

## Content review

The curriculum was migrated from the supplied source. Before broad publication, the book owner or a qualified educator should review Qur’an references, translations, religious wording, and intentional placeholders.

Never place a Supabase service-role key, secret key, administrator password, or private authentication token in this repository.
