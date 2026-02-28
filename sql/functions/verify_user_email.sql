-- =====================================================
-- FUNCTION: verify_user_email
-- Allow an admin/superadmin to manually verify a user's email
-- AND set their public profile as verified.
-- This bypasses the need for the user to click the email link.
-- =====================================================
CREATE OR REPLACE FUNCTION verify_user_email(target_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_caller_role VARCHAR;
BEGIN
  -- Check if the caller is an admin or superadmin
  SELECT role INTO v_caller_role
  FROM public.users
  WHERE id = auth.uid();

  IF v_caller_role NOT IN ('admin', 'superadmin') THEN
    RETURN json_build_object('success', false, 'error', 'Access denied: You must be an admin to verify users.');
  END IF;

  -- 1. Update Supabase Auth Table (Email Confirmation)
  UPDATE auth.users
  SET email_confirmed_at = COALESCE(email_confirmed_at, now()),
      updated_at = now()
  WHERE id = target_user_id;

  -- 2. Update Public Users Table (App Verification)
  UPDATE public.users
  SET is_verified = TRUE,
      modified_at = now(),
      modified_by = auth.uid()
  WHERE id = target_user_id;

  RETURN json_build_object('success', true, 'message', 'User verified successfully.');

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
