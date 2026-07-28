# Young Hearts Educator Studio Guide

## Opening the studio

1. Open `admin.html` on the live GitHub Pages site.
2. Enter the shared QAJ admin password.
3. The browser sends the password to the protected `qaj-yh-admin-login` Supabase Edge Function.
4. After successful verification, the studio opens with an authenticated administrator session.

The password is not embedded in the public website source. Do not replace this login with a hard-coded password or browser-side password hash.

## Edit book content

Open **Book Content**, select a letter and one of its words, then edit the required fields.

- Preparation, Warm-up, and Activity use one item per line.
- Set Publication to **Published** to make the word available publicly.
- Press **Save word** to publish the change through Supabase.

## Adjust the public letter cards

Open **Site Settings** and use **Letter card size**.

- Smaller percentages show more cards per row.
- Larger percentages create a more spacious display.
- Saving updates the public `card_scale` setting in Supabase.
- Visitors receive the new size automatically.

## Upload the book song

Open **Song & Audio**.

1. Choose **Whole book**.
2. Add a title and optional description.
3. Select the audio file.
4. Set **Featured** to Yes when it should be the main public song.
5. Set **Publication** to Published.
6. Upload the track.

The public player appears automatically when a published book-level track exists.

## Moderate family experiences

Open **Experiences**.

- **Approve** publishes the experience.
- **Reject** keeps it hidden from the public page.
- **Edit** changes the contributor name, description, or status.
- **Remove attachment** permanently deletes the image, video, or PDF while keeping the written experience.
- **Delete** permanently removes both the record and its stored attachment.

Review child privacy, names, faces, locations, language, and copyright before approval.

## Public submissions

Visitors may submit a written experience with an optional supported attachment. The public submission Edge Function validates the request, limits repeated submissions, stores attachments privately, and creates a Pending moderation record.

Nothing becomes public before administrator approval.

## Search behaviour

Arabic search ignores harakat and tatweel and normalizes common variants. Examples:

- `قمر` finds `قَمَرٌ`
- `ا` can match words beginning with `أ`, `إ`, `آ`, or `ٱ`

## Backups

Open **Backup & Export** and download a JSON backup regularly. It contains curriculum records, settings, audio metadata, and experience records. Media files remain in Supabase Storage.

## Safety rules

- Never place the administrator password in HTML, JavaScript, Markdown, or screenshots.
- Never expose a Supabase secret or service-role key in browser code.
- Keep Row Level Security enabled.
- Review Qur’an references and translations with a qualified educator.
- Upload only media and audio QAJ has permission to publish.
- Do not use browser-local edits as the production source of truth.
