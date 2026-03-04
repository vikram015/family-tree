import { useCallback, useMemo } from "react";
import { useAppSelector, useAppDispatch } from "../../store/hooks";
import {
  selectCurrentUser,
  selectUserProfile,
  selectAuthLoading,
  selectIsSuperAdmin,
  selectIsAdmin,
  logout as logoutAction,
  linkUserToNode as linkUserToNodeAction,
  updateUserProfile as updateUserProfileAction,
} from "../../store/slices/authSlice";
import { UserRole } from "../model/User";

export function useAuth() {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const userProfile = useAppSelector(selectUserProfile);
  const loading = useAppSelector(selectAuthLoading);
  const isSuperAdminValue = useAppSelector(selectIsSuperAdmin);
  const isAdminValue = useAppSelector(selectIsAdmin);

  const logout = useCallback(() => dispatch(logoutAction()).unwrap(), [dispatch]);

  const linkUserToNode = useCallback(
    (personId: string, treeId: string) =>
      dispatch(linkUserToNodeAction({ personId, treeId })).unwrap(),
    [dispatch],
  );

  const updateUserProfile = useCallback(
    (
      name: string,
      phone: string,
      email?: string,
      privacyPolicyAccepted?: boolean,
    ) =>
      dispatch(
        updateUserProfileAction({
          name,
          phone,
          email,
          privacyPolicyAccepted,
        }),
      ).unwrap(),
    [dispatch],
  );

  const isSuperAdmin = useCallback(() => isSuperAdminValue, [isSuperAdminValue]);
  const isAdmin = useCallback(() => isAdminValue, [isAdminValue]);

  const needsNodeLink = useMemo(() => {
    if (!currentUser || !userProfile) return false;
    if (userProfile.role === "superadmin") return false;
    return !userProfile.peopleId;
  }, [currentUser, userProfile]);

  const isApproved = useMemo(() => {
    if (!userProfile) return false;
    if (userProfile.role === "superadmin") return true;
    return !!userProfile.isVerified;
  }, [userProfile]);

  const hasPermission = useCallback(
    (requiredRole?: UserRole, villageId?: string) => {
      if (!userProfile) return false;
      if (userProfile.role === "superadmin") return true;
      if (!requiredRole) return true;
      if (!userProfile.isVerified) return false;
      if (userProfile.role === requiredRole || userProfile.role === "superadmin") {
        if (villageId) {
          return (userProfile.villages || []).includes(villageId);
        }
        return true;
      }
      return false;
    },
    [userProfile],
  );

  const canManageVillage = useCallback(
    (villageId: string) => {
      if (!userProfile) return false;
      if (userProfile.role === "superadmin") return true;
      if (!userProfile.isVerified) return false;
      return (userProfile.villages || []).includes(villageId);
    },
    [userProfile],
  );

  return useMemo(
    () => ({
      currentUser,
      userProfile,
      loading,
      logout,
      linkUserToNode,
      hasPermission,
      isSuperAdmin,
      isAdmin,
      isApproved,
      needsNodeLink,
      canManageVillage,
      updateUserProfile,
    }),
    [
      currentUser,
      userProfile,
      loading,
      logout,
      linkUserToNode,
      hasPermission,
      isSuperAdmin,
      isAdmin,
      isApproved,
      needsNodeLink,
      canManageVillage,
      updateUserProfile,
    ],
  );
}
