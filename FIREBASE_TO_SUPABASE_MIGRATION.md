# Firebase to Supabase Authentication Migration

## Summary

Firebase authentication has been successfully replaced with Supabase authentication.

## Changes Made

### 1. **Authentication Context** (`src/components/context/AuthContext.tsx`)

- **Removed**: Firebase imports (`getAuth`, `signOut`, `onAuthStateChanged`, `signInWithPhoneNumber`, `ConfirmationResult`)
- **Added**: Supabase client import and authentication methods
- **Changes**:
  - `signInWithPhone()`: Now uses `supabase.auth.signInWithOtp()` - returns void, stores session internally
  - `verifyOtp()`: Now uses `supabase.auth.verifyOtp()` - takes only OTP parameter
  - `logout()`: Now uses `supabase.auth.signOut()`
  - Removed `setupRecaptcha()` function (no longer needed)
  - User profile now fetched from `supabase.from('users')`
  - Auth state changes monitored with `supabase.auth.onAuthStateChange()`

### 2. **Login Modal** (`src/components/LoginModal/LoginModal.tsx`)

- **Removed**: Firebase `ConfirmationResult` type and `setupRecaptcha` function calls
- **Removed**: reCAPTCHA container element
- **Simplified**:
  - `handleSendOtp()`: No longer creates reCAPTCHA verifier
  - `handleVerifyOtp()`: Takes only OTP from `verifyOtp()` function
  - `handleResendOtp()`: Simplified cleanup logic
  - `handleClose()`: Removed reCAPTCHA cleanup code

### 3. **Dependencies** (`package.json`)

- **Removed**: `firebase` package (`^12.6.0`)
- **Kept**: `@supabase/supabase-js` (`^2.91.1`) as the primary backend client

### 4. **Firebase Configuration** (`src/firebase.tsx`)

- **Deprecated**: Authentication is no longer used
- **Kept**: Firebase Firestore initialization for backward compatibility with data migration queries
- **Status**: Kept as reference only; can be removed after data migration to Supabase is complete

## Key Differences

| Feature                  | Firebase                        | Supabase                |
| ------------------------ | ------------------------------- | ----------------------- |
| **OTP Submission**       | Requires reCAPTCHA verification | Direct SMS via Supabase |
| **Phone Auth Flow**      | 2-step (reCAPTCHA + OTP)        | Direct OTP submission   |
| **Session Management**   | Firebase Auth object            | Supabase Session object |
| **User Profile Storage** | Firestore `users` collection    | Supabase `users` table  |
| **Auth State Monitor**   | `onAuthStateChanged`            | `onAuthStateChange`     |

## Environment Variables Required

Ensure your `.env` file has:

```
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_key
```

## Database Schema Requirements

Supabase must have a `users` table with the following columns:

- `uid` (UUID, primary key)
- `phoneNumber` (text)
- `role` (text: 'admin', 'superadmin')
- `villages` (text[] or JSON array)
- `displayName` (text)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

## Testing Checklist

- [ ] User can submit phone number without reCAPTCHA
- [ ] OTP is received via SMS
- [ ] User can verify OTP and log in
- [ ] User profile is fetched from Supabase `users` table
- [ ] Logout works correctly
- [ ] Auth state persists across page refreshes
- [ ] Permissions and role-based access still work

## Next Steps

1. Remove `firebase` package from `package.json` if you've fully migrated all data to Supabase
2. Test phone authentication in development and production
3. Configure Supabase phone OTP settings in the Supabase console
4. Ensure SMS provider is configured (Twilio or Supabase's native SMS)
5. Once data migration is complete, remove `src/firebase.tsx` entirely

## Notes

- The migration maintains all existing permission logic (`hasPermission`, `isAdmin`, `canManageVillage`, etc.)
- User data structure remains the same, just stored in Supabase instead of Firestore
- No changes to components consuming the `useAuth()` hook (except LoginModal which was updated)
