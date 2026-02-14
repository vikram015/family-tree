-- =====================================================
-- MIGRATION: Add blood_group, is_alive, deceased_date to people table
-- Run this on your existing Supabase database
-- =====================================================

-- Add new columns (safe to re-run — uses IF NOT EXISTS pattern via DO block)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'people' AND column_name = 'blood_group') THEN
    ALTER TABLE people ADD COLUMN blood_group VARCHAR(5) DEFAULT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'people' AND column_name = 'is_alive') THEN
    ALTER TABLE people ADD COLUMN is_alive BOOLEAN DEFAULT TRUE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'people' AND column_name = 'deceased_date') THEN
    ALTER TABLE people ADD COLUMN deceased_date DATE DEFAULT NULL;
  END IF;
END $$;

-- After running this, also re-run the updated SQL functions:
--   sql/functions/add_person_to_tree.sql
--   sql/functions/update_person_in_tree.sql
--   sql/functions/get_complete_tree_by_id.sql
