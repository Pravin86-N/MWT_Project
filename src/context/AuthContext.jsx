import React, { createContext, useContext, useReducer, useEffect, useCallback } from "react";
import { authApi } from "../services/api";

const getInitialState = () => {
  try {
    const saved = localStorage.getItem("fdms-user");
    const token = localStorage.getItem("fdms-token");
    if (saved && (token || JSON.parse(saved)?.token)) {
      const parsed = JSON.parse(saved);
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

  // Restore session from localStorage and refresh from MongoDB Atlas
  useEffect(() => {
    const saved = localStorage.getItem("fdms-user");
    const token = localStorage.getItem("fdms-token");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        dispatch({ type: "RESTORE_SESSION", payload: parsed });
      } catch (e) {
        localStorage.removeItem("fdms-user");
      }
    }

    if (token) {
      authApi
        .getMe()
        .then((res) => {
          const freshUser = res.user || res.data;
          if (freshUser) {
            freshUser.token = token;
            localStorage.setItem("fdms-user", JSON.stringify(freshUser));
            dispatch({ type: "RESTORE_SESSION", payload: freshUser });
          }
        })
        .catch(() => {
          // Token expired or invalid
          console.warn("[Auth] Session expired or invalid");
        });
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
      return { ok: true, user };
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || "Invalid email or password.";
      dispatch({ type: "LOGIN_FAILURE", payload: errMsg });
      return { ok: false, error: errMsg };
    }
  }, []);

  const loginWithGoogle = useCallback(async (googleData) => {
    dispatch({ type: "LOGIN_START" });
    try {
      const res = await authApi.googleLogin(googleData);
      const user = res.user || res.data || res;
      if (res.token) {
        user.token = res.token;
        localStorage.setItem("fdms-token", res.token);
      }
      localStorage.setItem("fdms-user", JSON.stringify(user));
      dispatch({ type: "LOGIN_SUCCESS", payload: user });
      return { ok: true, user };
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || "Google authentication failed.";
      dispatch({ type: "LOGIN_FAILURE", payload: errMsg });
      return { ok: false, error: errMsg };
    }
  }, []);

  const loginWithOtp = useCallback(async (mobile, otp) => {
    dispatch({ type: "LOGIN_START" });
    try {
      const res = await authApi.verifyOtp(mobile, otp);
      const user = res.user || res.data || res;
      if (res.token) {
        user.token = res.token;
        localStorage.setItem("fdms-token", res.token);
      }
      localStorage.setItem("fdms-user", JSON.stringify(user));
      dispatch({ type: "LOGIN_SUCCESS", payload: user });
      return { ok: true, user };
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || "OTP verification failed.";
      dispatch({ type: "LOGIN_FAILURE", payload: errMsg });
      return { ok: false, error: errMsg };
    }
  }, []);

  const updateProfile = useCallback(async (profileData) => {
    try {
      const res = await authApi.updateProfile(profileData);
      const updatedUser = res.user || res.data || res;
      if (res.token) {
        updatedUser.token = res.token;
        localStorage.setItem("fdms-token", res.token);
      }
      localStorage.setItem("fdms-user", JSON.stringify(updatedUser));
      dispatch({ type: "UPDATE_USER", payload: updatedUser });
      return { ok: true, user: updatedUser, message: res.message || "Profile updated successfully" };
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || "Failed to update profile.";
      return { ok: false, error: errMsg };
    }
  }, []);

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
    dispatch({ type: "LOGOUT" });
  }, []);

  const loginWithEmailOtp = useCallback(async (email, otp) => {
    dispatch({ type: "LOGIN_START" });
    try {
      const res = await authApi.verifyLoginOtp(email, otp);
      const user = res.user || res.data || res;
      if (res.token) {
        user.token = res.token;
        localStorage.setItem("fdms-token", res.token);
      }
      localStorage.setItem("fdms-user", JSON.stringify(user));
      dispatch({ type: "LOGIN_SUCCESS", payload: user });
      return { ok: true, user };
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || "OTP verification failed.";
      dispatch({ type: "LOGIN_FAILURE", payload: errMsg });
      return { ok: false, error: errMsg };
    }
  }, []);

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
