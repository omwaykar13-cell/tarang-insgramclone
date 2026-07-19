/*
# Stories — Instagram-style ephemeral stories

## Overview
Adds a stories feature: users post image/video stories that disappear after
24 hours. Other users see a story bar at the top of their feed; tapping opens
a full-screen viewer that auto-advances through each user's active stories
with progress bars. Views are tracked so the story ring shows unviewed state.

## New Tables

1. `stories`
   - `id` uuid PK
   - `user_id` uuid NOT NULL DEFAULT auth.uid() references auth.users(id) ON DELETE CASCADE
   - `image_url` text NOT NULL — the story media URL
   - `media_kind` text NOT NULL DEFAULT 'image' — 'image' or 'video'
   - `caption` text nullable — optional text overlay
   - `created_at` timestamptz NOT NULL DEFAULT now()
   - `expires_at` timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
   - Index on user_id + created_at for feed queries.

2. `story_views`
   - `id` uuid PK
   - `viewer_id` uuid NOT NULL DEFAULT auth.uid() references auth.users(id) ON DELETE CASCADE
   - `story_id` uuid NOT NULL references stories(id) ON DELETE CASCADE
   - `viewed_at` timestamptz NOT NULL DEFAULT now()
   - UNIQUE(story_id, viewer_id) — one view per viewer per story
   - Index on story_id for view counts and viewer_id for "did I view" checks.

## Security (RLS)
- RLS enabled on both tables.
- Stories: any authenticated user can SELECT (stories are public within 24h);
  only the owner can INSERT their own stories; owners can DELETE their own.
- Story views: any authenticated user can SELECT (to know what's been viewed);
  a viewer can INSERT only their own view rows (viewer_id = auth.uid()).

## Important notes
1. Expiry is enforced at query time: the frontend filters `expires_at > now()`,
   so expired stories never appear even before any cleanup runs.
2. A UNIQUE(story_id, viewer_id) constraint plus an upsert pattern in the app
   makes view tracking idempotent — re-viewing a story doesn't create dupes.
3. Stories are intentionally public among authenticated users (like Instagram),
   so SELECT policies use `TO authenticated` without ownership restriction.
*/

CREATE TABLE IF NOT EXISTS stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  media_kind text NOT NULL DEFAULT 'image' CHECK (media_kind = ANY (ARRAY['image','video'])),
  caption text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE INDEX IF NOT EXISTS stories_user_created_idx ON stories (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS stories_active_idx ON stories (expires_at);

ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stories_select_authenticated" ON stories;
CREATE POLICY "stories_select_authenticated" ON stories
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "stories_insert_own" ON stories;
CREATE POLICY "stories_insert_own" ON stories
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "stories_delete_own" ON stories;
CREATE POLICY "stories_delete_own" ON stories
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS story_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (story_id, viewer_id)
);

CREATE INDEX IF NOT EXISTS story_views_story_idx ON story_views (story_id);
CREATE INDEX IF NOT EXISTS story_views_viewer_idx ON story_views (viewer_id);

ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "story_views_select_authenticated" ON story_views;
CREATE POLICY "story_views_select_authenticated" ON story_views
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "story_views_insert_own" ON story_views;
CREATE POLICY "story_views_insert_own" ON story_views
  FOR INSERT TO authenticated WITH CHECK (viewer_id = auth.uid());
