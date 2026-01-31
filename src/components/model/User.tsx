export type UserRole = "admin" | "superadmin";

export interface AppUser {
  id: string;
  email: string;
  role: UserRole;
  villages: string[]; // Village IDs that this admin can manage
  displayName?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string; // ID of superadmin who created this user
}
