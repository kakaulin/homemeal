"use client";

import { create } from "zustand";

import { exchangeGoogleCredential } from "./apiClient";

export type AuthUser = {
  email: string;
  name?: string;
  picture?: string;
  isAdmin: boolean;
};

export type AuthSession = { token: string; user: AuthUser };

const STORAGE_KEY = "home-meal-auth";
const GOOGLE_SCRIPT = "https://accounts.google.com/gsi/client";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

function readSession(): AuthSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as AuthSession;
    return parsed?.token && parsed?.user?.email ? parsed : null;
  } catch {
    return null;
  }
}

type AuthState = {
  session: AuthSession | null;
  ready: boolean;
  signingIn: boolean;
  error: string | null;
  hydrate: () => void;
  signIn: (credential: string) => Promise<void>;
  signOut: () => void;
};

export const useAuth = create<AuthState>((set) => ({
  session: null,
  ready: false,
  signingIn: false,
  error: null,

  hydrate: () => set({ session: readSession(), ready: true }),

  signIn: async (credential) => {
    set({ signingIn: true, error: null });

    try {
      const response = await exchangeGoogleCredential(credential);
      const session: AuthSession = { token: response.token, user: response.user };

      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      set({ session, signingIn: false });
    } catch (error) {
      set({
        signingIn: false,
        error: error instanceof Error ? error.message : "Не удалось войти",
      });
    }
  },

  signOut: () => {
    window.localStorage.removeItem(STORAGE_KEY);
    set({ session: null, error: null });
  },
}));

export const getAuthToken = () => useAuth.getState().session?.token ?? null;

let scriptPromise: Promise<void> | null = null;

export function loadGoogleScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.accounts?.id) return Promise.resolve();

  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = GOOGLE_SCRIPT;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Не удалось загрузить Google Identity Services"));
      document.head.appendChild(script);
    });
  }

  return scriptPromise;
}
