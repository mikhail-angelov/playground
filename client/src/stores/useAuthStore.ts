import { create } from "zustand";
import { HOST } from "./utils";

interface AuthState {
  isAuthenticated: boolean;
  login: (email: string) => Promise<"success" | "error">;
  checkAuthStatus: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  login: async (email: string) => {
    try {
      const response = await fetch(`${HOST}/api/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        set({ isAuthenticated: true });
        return "success";
      } else {
        return "error";
      }
    } catch (error) {
      console.error("Error during login:", error);
      return "error";
    }
  },
  checkAuthStatus: async () => {
    try {
      const response = await fetch(`${HOST}/api/auth/validate`, {
        method: "GET",
        credentials: "include", // Include cookies in the request
      });

      if (response.ok) {
        set({ isAuthenticated: true });
      } else {
        set({ isAuthenticated: false });
      }
    } catch (error) {
      console.error("Error checking authentication status:", error);
      set({ isAuthenticated: false });
    }
  },
  logout: async () => {
    try {
      const response = await fetch(`${HOST}/api/auth/logout`, {
        method: "POST",
        credentials: "include", // Include cookies in the request
      });

      if (response.ok) {
        set({ isAuthenticated: false });
        console.log("Logged out successfully");
      } else {
        console.error("Failed to log out");
      }
    } catch (error) {
      console.error("Error during logout:", error);
    }
  },
}));