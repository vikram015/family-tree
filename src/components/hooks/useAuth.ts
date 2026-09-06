import { useCallback, useMemo } from "react";
import { useAppSelector, useAppDispatch } from "../../store/hooks";
import {
  selectCurrentUser,
  selectUserProfile,
  selectAuthLoading,
  selectAuthInitialized,
  selectHadSession,
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
  const initialized = useAppSelector(selectAuthInitialized);
  const hadSession = useAppSelector(selectHadSession);
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
      gender?: string,
      dob?: string,
    ) =>
      dispatch(
        updateUserProfileAction({
          name,
          phone,
          email,
          privacyPolicyAccepted,
          gender,
          dob,
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
    (requiredRole?: UserRole, locationId?: string) => {
      if (!userProfile) return false;
      if (userProfile.role === "superadmin") return true;
      if (!requiredRole) return true;
      if (!userProfile.isVerified) return false;
      if (userProfile.role === requiredRole || userProfile.role === "superadmin") {
        if (locationId) {
          return (userProfile.locations || []).includes(locationId);
        }
        return true;
      }
      return false;
    },
    [userProfile],
  );

  const canManageLocation = useCallback(
    (locationId: string) => {
      if (!userProfile) return false;
      if (userProfile.role === "superadmin") return true;
      if (!userProfile.isVerified) return false;
      return (userProfile.locations || []).includes(locationId);
    },
    [userProfile],
  );

  return useMemo(
    () => ({
      currentUser,
      userProfile,
      loading,
      // `initialized` is false until Firebase first reports; `hadSession` says
      // whether the previous visit was signed in. Together they let a view pick
      // its first paint instead of defaulting to the signed-out one.
      initialized,
      hadSession,
      logout,
      linkUserToNode,
      hasPermission,
      isSuperAdmin,
      isAdmin,
      isApproved,
      needsNodeLink,
      canManageLocation,
      updateUserProfile,
    }),
    [
      currentUser,
      userProfile,
      loading,
      initialized,
      hadSession,
      logout,
      linkUserToNode,
      hasPermission,
      isSuperAdmin,
      isAdmin,
      isApproved,
      needsNodeLink,
      canManageLocation,
      updateUserProfile,
    ],
  );
}
