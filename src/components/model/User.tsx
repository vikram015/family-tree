export type UserRole = "admin" | "superadmin";

export interface AppUser {
  id: string;
  email: string;
  role: UserRole;
  villages: string[]; // Village IDs that this admin can manage
  peopleId?: string; // Linked person node ID
  isVerified?: boolean; // Superadmin approval flag
  displayName?: string;
  name?: string; // Aligning with DB column
  phone?: string;
  privacyPolicyAccepted?: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string; // ID of superadmin who created this user
}
