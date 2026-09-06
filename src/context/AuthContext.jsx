import React, { createContext, useContext, useReducer, useEffect, useCallback } from "react";
import { USERS } from "../data/seed";
import { authApi } from "../services/api";

const initialState = { status: "idle", user: null, error: null };

function authReducer(state, action) {
  switch (action.type) {
    case "LOGIN_START":
      return { ...state, status: "loading", error: null };
    case "LOGIN_SUCCESS":
      return { status: "authenticated", user: action.payload, error: null };
    case "LOGIN_FAILURE":
      return { ...state, status: "error", error: action.payload };
    case "LOGOUT":
      return { ...initialState };
    case "RESTORE_SESSION":
      return { status: "authenticated", user: action.payload, error: null };
    default:
      return state;
  }
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const saved = localStorage.getItem("fdms-user");
    if (saved) {
      try {
        dispatch({ type: "RESTORE_SESSION", payload: JSON.parse(saved) });
      } catch (e) {
        localStorage.removeItem("fdms-user");
      }
    }
  }, []);

  const login = useCallback(async (email, password) => {
    dispatch({ type: "LOGIN_START" });
    try {
      const res = await authApi.login(email, password);
      const user = res.user || res.data || res;
      if (res.token) {
        user.token = res.token;
        localStorage.setItem("fdms-token", res.token);
      }
      localStorage.setItem("fdms-user", JSON.stringify(user));
      dispatch({ type: "LOGIN_SUCCESS", payload: user });
      return { ok: true };
    } catch (err) {
      console.warn("[Auth] API login error, checking fallback seed credentials:", err.message);
      const found = USERS.find((u) => u.email === email && u.password === password);
      if (found) {
        const { password: _pw, ...safeUser } = found;
        localStorage.setItem("fdms-user", JSON.stringify(safeUser));
        dispatch({ type: "LOGIN_SUCCESS", payload: safeUser });
        return { ok: true };
      }
      const errMsg = err.response?.data?.message || err.message || "Invalid email or password.";
      dispatch({ type: "LOGIN_FAILURE", payload: errMsg });
      return { ok: false, error: errMsg };
    }
  }, []);

  const logout = useCallback(() => {
    authApi.logout();
    dispatch({ type: "LOGOUT" });
  }, []);

  return (
    <AuthContext.Provider value={{ state, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
