# Quranic Arabic for Young Hearts

A complete interactive learning platform for the 27 Arabic letters and 54 Qur’anic Arabic words in the original book.

## What is included

- Child-friendly public storybook experience
- Search, random discovery, local progress, and accessible keyboard navigation
- Full lesson guide, activity steps, story, Qur’an connection, dua, and wrap-up
- Community experience submissions with optional media
- Secure educator studio for content editing and moderation
- Book, letter, or word-level audio upload and publishing
- Experience approval, rejection, editing, image/file removal, and deletion
- Supabase database, Auth, Storage, Row Level Security, and public submission Edge Function
- Offline-safe packaged fallback content

## Live files

- `index.html` — public learning experience
- `admin.html` — protected educator studio
- `assets/` — source CSS and JavaScript
- `data/` — portable curriculum copy and fallback content
- `supabase/` — schema, content seed, and Edge Function source

## Admin activation

The owner email is pre-approved privately in Supabase. Open `admin.html`, choose **First-time setup**, use the approved email, and create a password. When email confirmation is enabled, confirm the message and return to sign in.

Never place a Supabase service-role key in this repository. The browser uses only the publishable key; privileged submission work runs inside the Edge Function.

## Audio

The public song section remains hidden until an administrator uploads and publishes a book-level audio track. Supported audio formats include MP3, M4A/MP4 audio, WAV, OGG, and WebM audio.

## Content review

The curriculum was migrated exactly from the supplied source. Before broad publication, the book owner or a qualified educator should review Qur’an references, translations, religious wording, and the intentional placeholder references that remain editable in the studio.
