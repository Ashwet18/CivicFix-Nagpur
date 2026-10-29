/**
 * context/auth.jsx
 *
 * DEVELOPMENT DEMO — NOT BACKEND AUTHENTICATION
 *
 * This file holds a local, in-memory demo session for UI development only.
 *
 * The current backend has no authentication endpoints. Replace this context
 * only after login and registration contracts are implemented server-side.
 * Everything that consumes this context (login screen, register screen,
 * header, etc.) will automatically use the real implementation.
 */

import { createContext, useContext, useState, useCallback } from 'react';

// ── Types (JSDoc for IDE hints without TypeScript) ────────────────────────────
/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} name
 * @property {string} email
 */

/**
 * @typedef {Object} AuthContextValue
 * @property {User|null}  user
 * @property {boolean}    isLoggedIn
 * @property {boolean}    isLoading
 * @property {string|null} authError
 * @property {(email:string, password:string) => Promise<boolean>} login
 * @property {(name:string, email:string, password:string) => Promise<boolean>} register
 * @property {() => void} logout
 * @property {() => void} clearAuthError
 */

const AuthContext = createContext(/** @type {AuthContextValue} */ (null));

// ── Mock credentials (dev only) ───────────────────────────────────────────────
const MOCK_USER = {
  id: 'mock-001',
  name: 'Demo Citizen',
  email: 'citizen@civicfix.dev',
  password: 'Demo@1234',   // never store real passwords like this
};

// Simulate a network delay so the loading state is visible in the UI
const fakeDelay = (ms = 1200) => new Promise((resolve) => setTimeout(resolve, ms));

// ── Provider ──────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user, setUser]           = useState(/** @type {User|null} */ (null));
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState(/** @type {string|null} */ (null));

  const clearAuthError = useCallback(() => setAuthError(null), []);

  // ── login ─────────────────────────────────────────────────────────────────
  // Demo-only: this does not authenticate against the CivicFix backend.
  const login = useCallback(async (email, password) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      await fakeDelay();

      const emailLower = email.trim().toLowerCase();
      if (
        emailLower === MOCK_USER.email.toLowerCase() &&
        password   === MOCK_USER.password
      ) {
        setUser({ id: MOCK_USER.id, name: MOCK_USER.name, email: MOCK_USER.email });
        return true;
      }

      // Use the same generic message for both wrong email and wrong password
      // (don't reveal which one was wrong — basic security hygiene)
      setAuthError(
        'Invalid demo email or password. This local demo is not connected to server authentication.'
      );
      return false;
    } catch (err) {
      setAuthError('Something went wrong. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── register ──────────────────────────────────────────────────────────────
  // Demo-only: this does not create an account on the CivicFix backend.
  const register = useCallback(async (name, email, _password) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      await fakeDelay();

      // This creates an in-memory demo session; it does not create an account.
      const newUser = {
        id: `mock-${Date.now()}`,
        name: name.trim(),
        email: email.trim().toLowerCase(),
      };
      setUser(newUser);
      return true;
    } catch (err) {
      setAuthError('Registration failed. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    setUser(null);
    setAuthError(null);
  }, []);

  const value = { user, isLoggedIn: !!user, isLoading, authError, login, register, logout, clearAuthError };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
