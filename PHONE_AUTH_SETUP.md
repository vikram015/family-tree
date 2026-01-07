# Phone Authentication & Role-Based Access Setup Guide

## Overview

This application now uses Firebase Phone Authentication with OTP verification and implements a role-based access control system with two roles:

- **Super Admin**: Full access to all villages and all operations
- **Admin**: Access limited to assigned villages only

## Firebase Console Setup

### 1. Enable Phone Authentication

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Authentication** → **Sign-in method**
4. Click on **Phone** provider
5. Click **Enable**
6. Add your authorized domains (e.g., `kinvia.in`, `localhost`)
7. Save the changes

### 2. Configure reCAPTCHA (Required for Phone Auth)

Phone authentication requires reCAPTCHA verification. Firebase handles this automatically, but you need to:

1. Ensure your domain is added to the authorized domains list
2. For local development, `localhost` should already be authorized
3. For production, add your domain (e.g., `kinvia.in`)

### 3. Set Up Firestore Collections

#### Users Collection

Create a collection named `users` with the following structure:

```javascript
users/
  {userId}/
    uid: string              // Firebase Auth UID
    phoneNumber: string      // Phone number with country code (e.g., +919876543210)
    role: string            // "admin" or "superadmin"
    villages: string[]      // Array of village/tree IDs (empty for superadmin)
    displayName: string     // Optional user display name
    createdAt: string       // ISO timestamp
    updatedAt: string       // ISO timestamp
    createdBy: string       // UID of creator (for superadmin-created users)
```

#### Create First Superadmin User (Manual Setup Required)

Since the first user will be created as "admin" by default, you need to manually create or update the first superadmin:

**Option A - Create via Firebase Console:**

1. Go to Firestore Database
2. Click "Start collection" or add to existing `users` collection
3. Add document with ID matching the Firebase Auth UID
4. Set fields:
   ```
   uid: "your-firebase-auth-uid"
   phoneNumber: "+919876543210"
   role: "superadmin"
   villages: []
   createdAt: "2024-01-01T00:00:00.000Z"
   updatedAt: "2024-01-01T00:00:00.000Z"
   ```

**Option B - First Login then Update:**

1. Login with your phone number (creates user with "admin" role)
2. Go to Firestore → `users` collection
3. Find your user document (by phone number)
4. Edit the document and change `role` from "admin" to "superadmin"
5. Clear the `villages` array

### 4. Firestore Security Rules

Update your Firestore security rules to enforce role-based access:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper function to check if user is authenticated
    function isSignedIn() {
      return request.auth != null;
    }

    // Helper function to get user profile
    function getUserProfile() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }

    // Helper function to check if user is superadmin
    function isSuperAdmin() {
      return isSignedIn() && getUserProfile().role == 'superadmin';
    }

    // Helper function to check if user can manage a village
    function canManageVillage(villageId) {
      let profile = getUserProfile();
      return isSignedIn() && (
        profile.role == 'superadmin' ||
        villageId in profile.villages
      );
    }

    // Users collection - only superadmin can manage
    match /users/{userId} {
      allow read: if isSignedIn() && (
        request.auth.uid == userId || isSuperAdmin()
      );
      allow create: if isSignedIn();
      allow update, delete: if isSuperAdmin();
    }

    // Trees collection - superadmin can manage all, admin can manage assigned
    match /trees/{treeId} {
      allow read: if true; // Public read
      allow create: if isSignedIn() && isSuperAdmin();
      allow update, delete: if isSignedIn() && canManageVillage(treeId);
    }

    // People collection - check treeId permission
    match /people/{personId} {
      allow read: if true; // Public read
      allow create, update, delete: if isSignedIn() &&
        canManageVillage(resource.data.treeId);
    }
  }
}
```

## Application Features

### Phone Authentication Flow

1. User enters phone number with country code (e.g., +919876543210)
   - The app automatically adds +91 if only a 10-digit number is entered
2. reCAPTCHA verification (invisible, automatic)
3. OTP is sent via SMS
4. User enters 6-digit OTP
5. On verification:
   - If first login: User profile created in Firestore with "admin" role
   - If existing: User profile loaded from Firestore
6. User is logged in and redirected

### Role-Based Access Control

#### Super Admin Capabilities:

- Access all villages/trees
- Add, edit, delete any record
- Access Admin Management page (`/admin`)
- Assign roles to users
- Assign villages to admin users
- Delete users

#### Admin Capabilities:

- Access only assigned villages/trees
- Add, edit, delete records in assigned villages only
- Cannot access Admin Management page
- Cannot manage other users

### Admin Management Interface (Superadmin Only)

Access: `/admin`

Features:

- View all users with their roles and village assignments
- Edit user roles (promote admin to superadmin or demote)
- Assign/remove villages for admin users
- Delete users (except yourself)
- Visual indicators:
  - Red chip for "Super Admin"
  - Blue chip for "Admin"
  - Village assignments displayed as chips

## Testing Checklist

### Authentication Testing

- [ ] Phone number input accepts +91 format
- [ ] 10-digit numbers auto-prefix with +91
- [ ] OTP is received via SMS
- [ ] 6-digit OTP verification works
- [ ] Invalid OTP shows error
- [ ] Resend OTP functionality works
- [ ] First-time login creates user profile in Firestore
- [ ] Returning login loads existing profile
- [ ] Logout works correctly

### Permission Testing

- [ ] Superadmin can access `/admin` page
- [ ] Regular admin cannot access `/admin` page
- [ ] Superadmin can edit any village
- [ ] Admin can only edit assigned villages
- [ ] Admin cannot edit unassigned villages (shows permission error)
- [ ] Superadmin can promote/demote users
- [ ] Superadmin can assign villages to admins

### UI Testing

- [ ] Header shows phone number instead of email
- [ ] Header shows role (Super Admin / Admin)
- [ ] Admin menu link only visible to superadmin
- [ ] Permission errors show clear messages
- [ ] Admin Management table loads all users
- [ ] Edit dialog updates user roles and villages
- [ ] Village assignment UI works correctly

## Deployment

### Before Deployment

1. Ensure Firebase Phone Authentication is enabled
2. Add production domain to authorized domains
3. Create first superadmin user manually
4. Update Firestore security rules
5. Test all features locally

### Build and Deploy

```bash
# Build the app
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting

# Or deploy all (hosting + firestore rules)
firebase deploy
```

### Post-Deployment

1. Login with superadmin account
2. Verify Admin Management page accessible
3. Create additional admin users
4. Assign villages to admin users
5. Test admin user login and permissions

## Troubleshooting

### reCAPTCHA Issues

- **Error**: "reCAPTCHA verification failed"
  - Ensure domain is added to authorized domains in Firebase Console
  - Clear browser cache and try again
  - Check browser console for specific error messages

### OTP Not Received

- Verify phone number format (+91XXXXXXXXXX)
- Check Firebase Console → Authentication → Usage for quota limits
- Ensure SMS provider is working (check Firebase Console status)

### Permission Denied Errors

- Verify user role in Firestore `users` collection
- Check Firestore security rules are deployed
- Ensure user profile has correct village assignments

### User Can't See Admin Menu

- Verify user role is "superadmin" in Firestore
- Check that `isSuperAdmin()` function returns true
- Reload the page after role change

## Future Enhancements

- Email notifications for role changes
- Audit log for admin actions
- Bulk user import/export
- More granular permissions (read-only, editor, etc.)
- Village assignment by region/category
- User activity dashboard

## Support

For issues or questions:

1. Check Firebase Console for authentication errors
2. Review browser console for client-side errors
3. Check Firestore security rules logs for permission denials
4. Verify user profile structure in Firestore
