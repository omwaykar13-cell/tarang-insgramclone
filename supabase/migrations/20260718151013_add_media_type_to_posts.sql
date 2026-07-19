/*
# Add media_type to posts (posts vs reels)

1. Overview
   Adds a `media_type` column to the `posts` table so a creator can mark
   content as a regular grid "post" or a vertical "reel". The Reels page
   surfaces all reels shared publicly by anyone in the app.

2. Modified Tables
   - `posts`
     * `media_type` (text, NOT NULL, default 'post') — 'post' or 'reel'.
       Existing rows back-fill to 'post' so nothing changes for current
       content.

3. Security
   - No policy changes. Existing RLS already allows authenticated users to
     SELECT all posts, so reels are readable by anyone signed in.
   - INSERT/UPDATE/DELETE remain owner-only.

4. Indexes
   - `posts_media_type_idx` on media_type for fast reel-only queries.
*/

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'post';

-- Backfill any pre-existing rows (defensive; column default already covers new rows)
UPDATE posts SET media_type = 'post' WHERE media_type IS NULL;

-- Optional check constraint to keep values clean
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'posts_media_type_check'
  ) THEN
    ALTER TABLE posts
      ADD CONSTRAINT posts_media_type_check
      CHECK (media_type IN ('post', 'reel'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS posts_media_type_idx ON posts(media_type);
