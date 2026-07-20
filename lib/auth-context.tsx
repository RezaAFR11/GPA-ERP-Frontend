"use client";

import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from "react";
import { authApi } from "./api";
import type { AppMenuPermission, RoleName, User } from "./types";

interface AuthState {
  user: User | null;
  allowedMenuKeys: string[];
  menus: AppMenuPermission[];
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  canAccessMenu: (key: string) => boolean;
  firstAllowedPath: () => string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    allowedMenuKeys: [],
    menus: [],
    isLoading: true,
    isAuthenticated: false,
  });

  const loadUser = useCallback(async () => {
    try {
      const [{ data: user }, { data: menuPermissions }] = await Promise.all([
        authApi.me(),
        authApi.menuPermissions(),
      ]);
      setState({
        user,
        allowedMenuKeys: menuPermissions.allowed_keys,
        menus: menuPermissions.menus,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch {
      setState({
        user: null,
        allowedMenuKeys: [],
        menus: [],
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, []);

  // On mount, restore the server-managed httpOnly cookie session.
  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = useCallback(async (email: string, password: string) => {
    await authApi.login(email, password);
    await loadUser();
  }, [loadUser]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore errors — clear local state regardless
    }
    setState({
      user: null,
      allowedMenuKeys: [],
      menus: [],
      isLoading: false,
      isAuthenticated: false,
    });
  }, []);

  const refreshUser = useCallback(async () => {
    await loadUser();
  }, [loadUser]);

  const allowedMenuKeySet = useMemo(
    () => new Set(state.allowedMenuKeys),
    [state.allowedMenuKeys],
  );

  const canAccessMenu = useCallback((key: string) => {
    if (state.user?.role.name === "SUPER_ADMIN") return true;
    return allowedMenuKeySet.has(key);
  }, [allowedMenuKeySet, state.user]);

  const firstAllowedPath = useCallback(() => {
    const isSelfServiceRole = state.user?.role.name === "WORKER" || state.user?.role.name === "STAFF";
    const hasSelfServiceMenu = ["hris_attendance", "hris_leave", "hris_my_payslip"]
      .some((key) => allowedMenuKeySet.has(key));
    if (isSelfServiceRole && hasSelfServiceMenu) return "/hris/me";
    // Everyone else: land on the launchpad
    return "/home";
  }, [allowedMenuKeySet, state.user]);

  const contextValue = useMemo<AuthContextValue>(() => ({
    ...state,
    login,
    logout,
    refreshUser,
    canAccessMenu,
    firstAllowedPath,
  }), [canAccessMenu, firstAllowedPath, login, logout, refreshUser, state]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function useCurrentUser(): User {
  const { user } = useAuth();
  if (!user) throw new Error("No authenticated user");
  return user;
}

// ─── Role hook ────────────────────────────────────────────────────────────────

export function useRole() {
  const { user } = useAuth();
  const role = user?.role.name ?? null;

  const hasRole = (...roles: RoleName[]): boolean =>
    role !== null && roles.includes(role);

  const isSuperAdmin = hasRole("SUPER_ADMIN");
  const isMD         = hasRole("MD", "SUPER_ADMIN");
  const isPM         = hasRole("PM", "PROJECT_CONTROL", "MD", "SUPER_ADMIN");
  const isCostControl= hasRole("COST_CONTROL", "SUPER_ADMIN");
  const isFinance    = hasRole("FINANCE", "SUPER_ADMIN");
  const isHR         = hasRole("GA", "HR", "SUPER_ADMIN");
  // Worker = site/field worker with HRIS self-service only
  const isWorker     = hasRole("WORKER");
  // Self-service: worker OR staff (office) — can see /hris/me portal
  const isSelfService = hasRole("WORKER", "STAFF");

  // Can sign legal documents (MD, PM/Project Control, or Super Admin)
  const canSign = hasRole("MD", "PM", "PROJECT_CONTROL", "SUPER_ADMIN");

  return {
    role, hasRole,
    isSuperAdmin, isMD, isPM, isCostControl, isFinance,
    isHR, isWorker, isSelfService,
    canSign,
  };
}

// ─── ProtectedRoute ───────────────────────────────────────────────────────────

export function ProtectedRoute({
  children,
  roles,
  fallback = null,
}: {
  children: React.ReactNode;
  roles?: RoleName[];
  fallback?: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) return <>{fallback}</>;
  if (roles && user && !roles.includes(user.role.name)) return <>{fallback}</>;
  return <>{children}</>;
}
