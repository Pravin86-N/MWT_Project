import React, { createContext, useContext, useReducer, useEffect, useCallback } from "react";
import { USERS } from "../data/seed";

/**
 * AuthContext
 * -------------------------------------------------------------
 * PURPOSE OF useReducer HERE:
 * A login flow isn't a single value, it's a small state machine:
 * idle -> loading -> authenticated  OR  idle -> loading -> error.
 * useState would need 2-3 separate booleans/strings that all have
 * to be kept in sync by hand (isLoading, user, error...). A
 * reducer lets every possible transition be described in one
 * place as `action.type`, which is easier to read and impossible
 * to put into an invalid combination of states.
 *
 * PURPOSE OF useContext HERE:
 * The current user and login/logout functions are needed by the
 * Navbar, the ProtectedRoute guard, and the Dashboard — none of
 * which are parent/child of each other. Context avoids threading
 * `user`, `login`, `logout` through props at every level.
 */

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

  // useEffect: on first mount, check localStorage for a previously
  // saved session so a page refresh doesn't log the user out.
  useEffect(() => {
    const saved = localStorage.getItem("fdms-user");
    if (saved) dispatch({ type: "RESTORE_SESSION", payload: JSON.parse(saved) });
  }, []);

  // useCallback: login/logout are passed down through context to
  // far-away components (Login page, Navbar). Memoizing them keeps
  // their identity stable so consumers relying on them in their
  // own dependency arrays (e.g. another useEffect/useCallback)
  // don't re-run unnecessarily.
  const login = useCallback(async (email, password) => {
    dispatch({ type: "LOGIN_START" });
    // simulate a network round-trip to an auth API
    await new Promise((resolve) => setTimeout(resolve, 600));
    const found = USERS.find((u) => u.email === email && u.password === password);
    if (found) {
      const { password: _pw, ...safeUser } = found;
      localStorage.setItem("fdms-user", JSON.stringify(safeUser));
      dispatch({ type: "LOGIN_SUCCESS", payload: safeUser });
      return { ok: true };
    }
    dispatch({ type: "LOGIN_FAILURE", payload: "Invalid email or password." });
    return { ok: false };
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("fdms-user");
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
