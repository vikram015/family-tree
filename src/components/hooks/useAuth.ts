/**
 * Compatibility hooks for migrating from Context to Redux
 * These provide the same API as the old Context hooks
 */

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

  // Helper functions that use the already-selected userProfile
  const hasPermission = (requiredRole?: UserRole, villageId?: string) => {
    if (!userProfile) return false;
    if (userProfile.role === 'super_admin') return true;
    if (!requiredRole) return true;
    if (userProfile.role === requiredRole) {
      if (villageId && userProfile.village_id !== villageId) return false;
      return true;
    }
    return false;
  };

  const canManageVillage = (villageId: string) => {
    if (!userProfile) return false;
    if (userProfile.role === 'super_admin') return true;
    return userProfile.village_id === villageId;
  };

  return {
    currentUser,
    userProfile,
    loading,
    signUpWithEmail: (email: string, password: string) => 
      dispatch(signUpAction({ email, password })).unwrap(),
    signInWithEmail: (email: string, password: string) => 
      dispatch(signInAction({ email, password })).unwrap(),
    logout: () => dispatch(logoutAction()).unwrap(),
    hasPermission,
    isSuperAdmin: () => isSuperAdminValue,
    isAdmin: () => isAdminValue,
    canManageVillage,
  };
}
