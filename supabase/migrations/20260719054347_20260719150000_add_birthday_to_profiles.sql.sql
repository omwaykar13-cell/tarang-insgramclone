/*
# Add birthday to profiles

1. Changes
   - Adds a `birthday` column (date, nullable) to the `profiles` table.
   - Collected at sign-up so the app can show a birthday wish banner on the
     user's birthday each year.

2. Security
   - No policy changes needed: the existing `profiles_update_own` policy
     (auth.uid() = id) already lets a user update their own row, and
     `profiles_select_all` already lets authenticated users read it.
   - The column is nullable so existing profiles are unaffected.

3. Notes
   - Stored as `date` (month + day + year). The frontend compares month/day
     to today to decide whether to show the banner.
*/

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birthday date;
