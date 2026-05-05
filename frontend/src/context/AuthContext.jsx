import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, formatApiErrorDetail } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = checking, false = unauth, object = authed
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch (e) {
      setUser(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const login = async (email, password) => {
    try {
      const { data } = await api.post("/auth/login", { email, password });
      setUser(data);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: formatApiErrorDetail(e.response?.data?.detail) || e.message };
    }
  };

  const register = async (email, password, name) => {
    try {
      const { data } = await api.post("/auth/register", { email, password, name });
      setUser(data);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: formatApiErrorDetail(e.response?.data?.detail) || e.message };
    }
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch {}
    setUser(false);
  };

  const updateMode = async (mode) => {
    try {
      await api.patch("/user/mode", { mode });
      setUser((u) => (u ? { ...u, mode } : u));
    } catch {}
  };

  const updateVoice = async (voice) => {
    try {
      await api.patch("/user/voice", { voice });
      setUser((u) => (u ? { ...u, voice } : u));
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateMode, updateVoice, refresh: fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
