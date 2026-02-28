-- =====================================================
-- TABLE: VILLAGE ACCESS REQUESTS
-- =====================================================
CREATE TABLE IF NOT EXISTS village_access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  village_id UUID NOT NULL REFERENCES village(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  request_message TEXT,
  review_note TEXT,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT now(),
  modified_at TIMESTAMP DEFAULT now(),
  is_deleted BOOLEAN DEFAULT FALSE,
  CONSTRAINT chk_village_access_requests_status
    CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- Prevent duplicate active pending requests for same user+village
CREATE UNIQUE INDEX IF NOT EXISTS uq_village_access_requests_pending
  ON village_access_requests(requester_user_id, village_id)
  WHERE status = 'pending' AND is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_village_access_requests_requester
  ON village_access_requests(requester_user_id) WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_village_access_requests_village
  ON village_access_requests(village_id) WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_village_access_requests_status
  ON village_access_requests(status) WHERE is_deleted = FALSE;

ALTER TABLE village_access_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "var_read_policy" ON village_access_requests;
CREATE POLICY "var_read_policy" ON village_access_requests
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "var_insert_policy" ON village_access_requests;
CREATE POLICY "var_insert_policy" ON village_access_requests
  FOR INSERT WITH CHECK (auth.uid() = requester_user_id);

DROP POLICY IF EXISTS "var_update_policy" ON village_access_requests;
CREATE POLICY "var_update_policy" ON village_access_requests
  FOR UPDATE USING (true) WITH CHECK (true);
