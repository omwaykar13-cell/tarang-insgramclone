/*
# Messaging, calls, shares, and streaks for Tarang

## Overview
Adds a complete direct-messaging layer to the social app: 1:1 conversations,
text messages, sharing posts/reels into a conversation by username,
in-app "calling" by username (call signaling records + status), and
chat streaks that increment daily when two users exchange messages or
shares and reset to 0 when 24 hours pass with no activity.

## New Tables

1. `conversations`
   - `id` uuid PK
   - `user_a` uuid NOT NULL (references auth.users) — the lower-id participant
   - `user_b` uuid NOT NULL (references auth.users) — the higher-id participant
   - `created_at` timestamptz default now()
   - UNIQUE(user_a, user_b) so two users share exactly one conversation.

2. `messages`
   - `id` uuid PK
   - `conversation_id` uuid NOT NULL references conversations(id) ON DELETE CASCADE
   - `sender_id` uuid NOT NULL DEFAULT auth.uid() references auth.users(id) ON DELETE CASCADE
   - `content` text (nullable when the message is only a share)
   - `shared_post_id` uuid nullable references posts(id) ON DELETE SET NULL
   - `created_at` timestamptz default now()

3. `calls`
   - `id` uuid PK
   - `conversation_id` uuid NOT NULL references conversations(id) ON DELETE CASCADE
   - `caller_id` uuid NOT NULL DEFAULT auth.uid() references auth.users(id) ON DELETE CASCADE
   - `status` text NOT NULL DEFAULT 'ringing' — one of ringing, accepted, declined, missed, ended
   - `started_at` timestamptz default now()
   - `ended_at` timestamptz nullable

4. `streaks`
   - `id` uuid PK
   - `conversation_id` uuid NOT NULL references conversations(id) ON DELETE CASCADE
   - `count` int NOT NULL DEFAULT 0 — current consecutive-day streak
   - `last_activity_at` timestamptz NOT NULL DEFAULT now()
   - `last_bumped_at` date NOT NULL DEFAULT (now()::date) — the calendar day the streak was last incremented
   - UNIQUE(conversation_id)

## Security (RLS)
- RLS enabled on every new table.
- A participant of a conversation can SELECT/INSERT/UPDATE rows they are a party to.
- Policies use EXISTS checks against conversations membership for child tables
  (messages, calls, streaks) so both participants can read and write within their
  own conversation. Sender defaults to auth.uid() so inserts that omit sender_id
  still satisfy WITH CHECK.

## Important notes
1. Streak bumping is handled in the frontend at message-send time: on each send,
   the app reads the streak row, compares last_activity_at to now(); if the last
   activity was on the previous calendar day, count increments; if more than
   24 hours passed, count resets to 1; same-day sends keep the count. This keeps
   the streak logic in one place and avoids a separate cron.
2. Calls are signaling-only records (status lifecycle). Real-time audio/video
   transport is out of scope; the UI shows ringing/accepted/ended states.
3. Sharing a post/reel inserts a messages row with shared_post_id set and
   optional content, so shares appear inline in the chat thread.
*/

-- conversations
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_a, user_b),
  CHECK (user_a <> user_b)
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conv_select_participants" ON conversations;
CREATE POLICY "conv_select_participants" ON conversations
  FOR SELECT TO authenticated
  USING (auth.uid() = user_a OR auth.uid() = user_b);

DROP POLICY IF EXISTS "conv_insert_participants" ON conversations;
CREATE POLICY "conv_insert_participants" ON conversations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);

-- messages
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  content text,
  shared_post_id uuid REFERENCES posts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_conversation_created_idx
  ON messages (conversation_id, created_at DESC);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "msg_select_participants" ON messages;
CREATE POLICY "msg_select_participants" ON messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
    )
  );

DROP POLICY IF EXISTS "msg_insert_participants" ON messages;
CREATE POLICY "msg_insert_participants" ON messages
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
    )
    AND messages.sender_id = auth.uid()
  );

-- calls
CREATE TABLE IF NOT EXISTS calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  caller_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'ringing'
    CHECK (status = ANY (ARRAY['ringing','accepted','declined','missed','ended'])),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);

CREATE INDEX IF NOT EXISTS calls_conversation_idx ON calls (conversation_id, started_at DESC);

ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "call_select_participants" ON calls;
CREATE POLICY "call_select_participants" ON calls
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = calls.conversation_id
        AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
    )
  );

DROP POLICY IF EXISTS "call_insert_participants" ON calls;
CREATE POLICY "call_insert_participants" ON calls
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = calls.conversation_id
        AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
    )
    AND calls.caller_id = auth.uid()
  );

DROP POLICY IF EXISTS "call_update_participants" ON calls;
CREATE POLICY "call_update_participants" ON calls
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = calls.conversation_id
        AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = calls.conversation_id
        AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
    )
  );

-- streaks
CREATE TABLE IF NOT EXISTS streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL UNIQUE REFERENCES conversations(id) ON DELETE CASCADE,
  count int NOT NULL DEFAULT 0,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  last_bumped_at date NOT NULL DEFAULT (now()::date)
);

ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "streak_select_participants" ON streaks;
CREATE POLICY "streak_select_participants" ON streaks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = streaks.conversation_id
        AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
    )
  );

DROP POLICY IF EXISTS "streak_upsert_participants" ON streaks;
CREATE POLICY "streak_upsert_participants" ON streaks
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = streaks.conversation_id
        AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
    )
  );

DROP POLICY IF EXISTS "streak_update_participants" ON streaks;
CREATE POLICY "streak_update_participants" ON streaks
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = streaks.conversation_id
        AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = streaks.conversation_id
        AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
    )
  );
