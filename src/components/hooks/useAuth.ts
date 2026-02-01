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

  const signUpWithEmail = useCallback((email: string, password: string) => 
      dispatch(signUpAction({ email, password })).unwrap(), [dispatch]);

  const signInWithEmail = useCallback((email: string, password: string) => 
      dispatch(signInAction({ email, password })).unwrap(), [dispatch]);

  const logout = useCallback(() => dispatch(logoutAction()).unwrap(), [dispatch]);

  const isSuperAdmin = useCallback(() => isSuperAdminValue, [isSuperAdminValue]);
  const isAdmin = useCallback(() => isAdminValue, [isAdminValue]);

  // Helper functions that use the already-selected userProfile
  const hasPermission = useCallback((requiredRole?: UserRole, villageId?: string) => {
    if (!userProfile) return false;
    if (userProfile.role === 'superadmin') return true;
    if (!requiredRole) return true;
    if (userProfile.role === requiredRole) {
      if (villageId && userProfile.village_id !== villageId) return false;
      return true;
    }
    return false;
  }, [userProfile]);

  const canManageVillage = useCallback((villageId: string) => {
    if (!userProfile) return false;
    if (userProfile.role === 'superadmin') return true;
    return userProfile.village_id === villageId;
  }, [userProfile]);

  return useMemo(() => ({
    currentUser,
    userProfile,
    loading,
    signUpWithEmail,
    signInWithEmail,
    logout,
    hasPermission,
    isSuperAdmin,
    isAdmin,
    canManageVillage,
  }), [
    currentUser,
    userProfile,
    loading,
    signUpWithEmail,
    signInWithEmail,
    logout,
    hasPermission,
    isSuperAdmin,
    isAdmin,
    canManageVillage
  ]);
}
