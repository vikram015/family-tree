export type UserRole = "admin" | "superadmin";

export interface AppUser {
  id: string;
  email: string;
  role: UserRole;
  locations: string[]; // Location IDs that this admin can manage
  peopleId?: string; // Linked person node ID
  isVerified?: boolean; // Superadmin approval flag
  isBlocked?: boolean; // Blocked by a superadmin — cannot use the app
  blockedReason?: string | null; // Optional message shown to the blocked user
  displayName?: string;
  name?: string; // Aligning with DB column
  phone?: string;
  privacyPolicyAccepted?: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string; // ID of superadmin who created this user
  lastLoginAt?: string | null; // Most recent login timestamp (admin view)
}
