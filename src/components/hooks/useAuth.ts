/**
 * Compatibility hooks for migrating from Context to Redux
 * These provide the same API as the old Context hooks
 */

import { useCallback, useMemo } from 'react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import {
  selectCurrentUser,
  selectUserProfile,
  selectAuthLoading,
  selectIsSuperAdmin,
  selectIsAdmin,
  signUpWithEmail as signUpAction,
  signInWithEmail as signInAction,
  logout as logoutAction,
  sendPasswordResetEmail as sendPasswordResetEmailAction,
  updatePassword as updatePasswordAction,
  selectResetPasswordMode,
  linkUserToNode as linkUserToNodeAction,
  updateUserProfile as updateUserProfileAction,
} from '../../store/slices/authSlice';
import { UserRole } from '../model/User';

/**
 * Hook to replace useAuth() from AuthContext
 * Provides same API but backed by Redux
 */
export function useAuth() {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const userProfile = useAppSelector(selectUserProfile);
  const loading = useAppSelector(selectAuthLoading);
  const isSuperAdminValue = useAppSelector(selectIsSuperAdmin);
  const isAdminValue = useAppSelector(selectIsAdmin);
  const resetPasswordMode = useAppSelector(selectResetPasswordMode);

  const signUpWithEmail = useCallback((email: string, password: string, name: string, phone: string) => 
      dispatch(signUpAction({ email, password, name, phone })).unwrap(), [dispatch]);

  const signInWithEmail = useCallback((email: string, password: string) => 
      dispatch(signInAction({ email, password })).unwrap(), [dispatch]);

  const logout = useCallback(() => dispatch(logoutAction()).unwrap(), [dispatch]);

  const sendPasswordResetEmail = useCallback((email: string) =>
      dispatch(sendPasswordResetEmailAction(email)).unwrap(), [dispatch]);

  const updatePassword = useCallback((password: string) =>
      dispatch(updatePasswordAction(password)).unwrap(), [dispatch]);

  const linkUserToNode = useCallback((personId: string, treeId: string) =>
      dispatch(linkUserToNodeAction({ personId, treeId })).unwrap(), [dispatch]);

  const updateUserProfile = useCallback((name: string, phone: string) =>
      dispatch(updateUserProfileAction({ name, phone })).unwrap(), [dispatch]);

  const isSuperAdmin = useCallback(() => isSuperAdminValue, [isSuperAdminValue]);
  const isAdmin = useCallback(() => isAdminValue, [isAdminValue]);

  // Whether the admin user needs to link themselves to a node (first login)
  const needsNodeLink = useMemo(() => {
    if (!currentUser || !userProfile) return false;
    if (userProfile.role === 'superadmin') return false;
    return !userProfile.peopleId;
  }, [currentUser, userProfile]);

  // Whether the admin user is approved to edit trees
  const isApproved = useMemo(() => {
    if (!userProfile) return false;
    if (userProfile.role === 'superadmin') return true;
    return !!userProfile.isVerified;
  }, [userProfile]);

  // Permission check: role + village access + approval
  const hasPermission = useCallback((requiredRole?: UserRole, villageId?: string) => {
    if (!userProfile) return false;
    if (userProfile.role === 'superadmin') return true;
    if (!requiredRole) return true;
    // Admin must be approved (verified) to have write permissions
    if (!userProfile.isVerified) return false;
    if (userProfile.role === requiredRole || userProfile.role === 'superadmin') {
      if (villageId) {
        return (userProfile.villages || []).includes(villageId);
      }
      return true;
    }
    return false;
  }, [userProfile]);

  const canManageVillage = useCallback((villageId: string) => {
    if (!userProfile) return false;
    if (userProfile.role === 'superadmin') return true;
    if (!userProfile.isVerified) return false;
    return (userProfile.villages || []).includes(villageId);
  }, [userProfile]);

  return useMemo(() => ({
    currentUser,
    userProfile,
    loading,
    signUpWithEmail,
    signInWithEmail,
    logout,
    linkUserToNode,
    hasPermission,
    isSuperAdmin,
    isAdmin,
    isApproved,
    needsNodeLink,
    canManageVillage,
    sendPasswordResetEmail,
    updatePassword,
    resetPasswordMode,
    updateUserProfile,
  }), [
    currentUser, userProfile, loading,
    signUpWithEmail, signInWithEmail, logout, linkUserToNode,
    hasPermission, isSuperAdmin, isAdmin, isApproved, needsNodeLink,
    canManageVillage, sendPasswordResetEmail, updatePassword, resetPasswordMode,
    updateUserProfile,
  ]);
}
