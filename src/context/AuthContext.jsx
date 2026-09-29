import React, { createContext, useContext, useReducer, useEffect, useCallback } from "react";
import { authApi } from "../services/api";

const getInitialState = () => {
  try {
    const saved = localStorage.getItem("fdms-user") || localStorage.getItem("user");
    const token = localStorage.getItem("fdms-token") || localStorage.getItem("token");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (token && !parsed.token) parsed.token = token;
      return { status: "authenticated", user: parsed, error: null };
    }
  } catch (e) {
    // Ignore invalid JSON
  }
  return { status: "idle", user: null, error: null };
};

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
    case "UPDATE_USER":
      return { ...state, user: { ...state.user, ...action.payload } };
    default:
      return state;
  }
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, undefined, getInitialState);

  // Helper to store user, token, role in localStorage
  const persistSession = useCallback((user, token) => {
    if (token) {
      localStorage.setItem("fdms-token", token);
      localStorage.setItem("token", token);
    }
    if (user) {
      if (token && !user.token) user.token = token;
      localStorage.setItem("fdms-user", JSON.stringify(user));
      localStorage.setItem("user", JSON.stringify(user));
      if (user.role) {
        localStorage.setItem("fdms-role", user.role);
        localStorage.setItem("role", user.role);
      }
    }
  }, []);

  // Restore session from localStorage and refresh from MongoDB Atlas
  useEffect(() => {
    const saved = localStorage.getItem("fdms-user") || localStorage.getItem("user");
    const token = localStorage.getItem("fdms-token") || localStorage.getItem("token");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (token && !parsed.token) parsed.token = token;
        dispatch({ type: "RESTORE_SESSION", payload: parsed });
      } catch (e) {
        localStorage.removeItem("fdms-user");
        localStorage.removeItem("user");
      }
    }

    if (token) {
      authApi
        .getMe()
        .then((res) => {
          const freshUser = res.user || res.data;
          if (freshUser) {
            persistSession(freshUser, token);
            dispatch({ type: "RESTORE_SESSION", payload: freshUser });
          }
        })
        .catch(() => {
          console.warn("[Auth] Session validation request failed or offline");
        });
    }
  }, [persistSession]);

  const login = useCallback(async (email, password) => {
    dispatch({ type: "LOGIN_START" });
    try {
      console.log("[Auth] Dispatching login request to API...");
      const res = await authApi.login(email, password);
      const user = res.user || res.data?.user || res.data || res;
      const token = res.token || res.data?.token || user.token;

      persistSession(user, token);
      console.log("[Auth] Login successful. Role:", user.role);
      dispatch({ type: "LOGIN_SUCCESS", payload: user });
      return { ok: true, user, token };
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || "Invalid email or password.";
      console.error("[Auth] Login error:", errMsg);
      dispatch({ type: "LOGIN_FAILURE", payload: errMsg });
      return { ok: false, error: errMsg };
    }
  }, [persistSession]);

  const loginWithGoogle = useCallback(async (googleData) => {
    dispatch({ type: "LOGIN_START" });
    try {
      const res = await authApi.googleLogin(googleData);
      const user = res.user || res.data?.user || res.data || res;
      const token = res.token || res.data?.token || user.token;

      persistSession(user, token);
      dispatch({ type: "LOGIN_SUCCESS", payload: user });
      return { ok: true, user, token };
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || "Google authentication failed.";
      dispatch({ type: "LOGIN_FAILURE", payload: errMsg });
      return { ok: false, error: errMsg };
    }
  }, [persistSession]);

  const loginWithOtp = useCallback(async (mobile, otp) => {
    dispatch({ type: "LOGIN_START" });
    try {
      const res = await authApi.verifyOtp(mobile, otp);
      const user = res.user || res.data?.user || res.data || res;
      const token = res.token || res.data?.token || user.token;

      persistSession(user, token);
      dispatch({ type: "LOGIN_SUCCESS", payload: user });
      return { ok: true, user, token };
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || "OTP verification failed.";
      dispatch({ type: "LOGIN_FAILURE", payload: errMsg });
      return { ok: false, error: errMsg };
    }
  }, [persistSession]);

  const updateProfile = useCallback(async (profileData) => {
    try {
      const res = await authApi.updateProfile(profileData);
      const updatedUser = res.user || res.data?.user || res.data || res;
      const token = res.token || res.data?.token || updatedUser.token;

      persistSession(updatedUser, token);
      dispatch({ type: "UPDATE_USER", payload: updatedUser });
      return { ok: true, user: updatedUser, message: res.message || "Profile updated successfully" };
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || "Failed to update profile.";
      return { ok: false, error: errMsg };
    }
  }, [persistSession]);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    try {
      const res = await authApi.changePassword(currentPassword, newPassword);
      return { ok: true, message: res.message || "Password changed successfully" };
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || "Failed to change password.";
      return { ok: false, error: errMsg };
    }
  }, []);

  const logout = useCallback(() => {
    authApi.logout();
    localStorage.removeItem("fdms-token");
    localStorage.removeItem("token");
    localStorage.removeItem("fdms-user");
    localStorage.removeItem("user");
    localStorage.removeItem("fdms-role");
    localStorage.removeItem("role");
    dispatch({ type: "LOGOUT" });
  }, []);

  const loginWithEmailOtp = useCallback(async (email, otp) => {
    dispatch({ type: "LOGIN_START" });
    try {
      const res = await authApi.verifyLoginOtp(email, otp);
      const user = res.user || res.data?.user || res.data || res;
      const token = res.token || res.data?.token || user.token;

      persistSession(user, token);
      dispatch({ type: "LOGIN_SUCCESS", payload: user });
      return { ok: true, user, token };
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || "OTP verification failed.";
      dispatch({ type: "LOGIN_FAILURE", payload: errMsg });
      return { ok: false, error: errMsg };
    }
  }, [persistSession]);

  return (
    <AuthContext.Provider
      value={{
        state,
        login,
        loginWithGoogle,
        loginWithOtp,
        loginWithEmailOtp,
        logout,
        changePassword,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
