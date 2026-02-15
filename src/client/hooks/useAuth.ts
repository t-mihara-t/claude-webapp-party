import { useState, useEffect, useCallback } from "react";
import { apiGet, apiPost } from "@/lib/api";
import type { Organizer } from "@/types";

interface AuthState {
  user: Organizer | null;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    apiGet<Organizer>("/auth/me")
      .then((user) => {
        if (!cancelled) {
          setState({ user, loading: false });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ user: null, loading: false });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(() => {
    window.location.href = "/api/auth/login";
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiPost("/auth/logout");
    } catch {
      // Ignore errors on logout
    }
    setState({ user: null, loading: false });
    window.location.href = "/";
  }, []);

  return {
    user: state.user,
    loading: state.loading,
    login,
    logout,
  };
}
