/*
# Add video media + private profiles

1. Overview
   Two features:
   a) Reels can be images OR videos. Adds a `media_kind` column to posts
      ('image' | 'video') so the UI can render the right element.
   b) Profiles can be public or private. A private profile's posts are only
      visible to the owner and to mutual followers (viewer follows the
      owner AND the owner follows the viewer back).

2. Modified Tables
   - `posts`
     * `media_kind` (text, NOT NULL, default 'image') — 'image' or 'video'.
   - `profiles`
     * `is_private` (boolean, NOT NULL, default false) — when true, the
       profile's posts are hidden from non-mutual followers.

3. Security (RLS)
   - `posts` SELECT policy rewritten: a post is visible to the current
     user if the owner's profile is public, OR the current user owns the
     post, OR the current user and owner mutually follow each other.
   - All other policies unchanged.

4. Indexes
   - none added.
*/

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS media_kind text NOT NULL DEFAULT 'image';

UPDATE posts SET media_kind = 'image' WHERE media_kind IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'posts_media_kind_check'
  ) THEN
    ALTER TABLE posts
      ADD CONSTRAINT posts_media_kind_check
      CHECK (media_kind IN ('image', 'video'));
  END IF;
END $$;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false;

-- Rewrite posts SELECT policy to respect private profiles
DROP POLICY IF EXISTS "posts_select_all" ON posts;
CREATE POLICY "posts_select_all" ON posts FOR SELECT
  TO authenticated USING (
    posts.user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = posts.user_id AND NOT p.is_private
    )
    OR (
      EXISTS (
        SELECT 1 FROM follows f1
        WHERE f1.follower_id = auth.uid() AND f1.followee_id = posts.user_id
      )
      AND EXISTS (
        SELECT 1 FROM follows f2
        WHERE f2.follower_id = posts.user_id AND f2.followee_id = auth.uid()
      )
    )
  );
