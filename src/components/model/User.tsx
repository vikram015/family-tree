export type UserRole = "admin" | "superadmin";

export interface AppUser {
  uid: string;
  phoneNumber: string;
  role: UserRole;
  villages: string[]; // Village IDs that this admin can manage
  displayName?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string; // UID of superadmin who created this user
}
