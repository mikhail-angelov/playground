import { create } from "zustand";
import { toast } from "sonner"
import { u } from "@lingui/react/dist/shared/react.db1293d4";

interface AuthState {
  isAuthenticated: boolean;
  email?: string;
  isLoading: boolean;
  hasAi: boolean
  login: (email: string) => Promise<"success" | "error">;
  checkAuthStatus: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  email: '',
  hasAi: false,
  isLoading: false,
  login: async (email: string) => {
    try {
      set({ isLoading: true });
      const response = await fetch('/api/auth', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        toast.success("Check your email for the login link!");
        set({ isLoading: false });
        return "success";
      } 
    } catch (error) {
      console.error("Error during login:", error);
    }
    toast.error("Failed to send login email.");
    set({ isLoading: false });
    return "error";
  },
  checkAuthStatus: async () => {
    try {
      const response = await fetch('/api/auth/validate', {
        method: "GET",
        credentials: "include"
      });

      if (response.ok) {
        const { user } = await response.json();
        set({ isAuthenticated: true, email: user.email, hasAi: user.hasAi });
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
      set({ isLoading: true });
      const response = await fetch('/api/auth/logout', {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        set({ isAuthenticated: false, email: undefined, isLoading: false, hasAi: false });
        toast.success("Logged out successfully");
        console.log("Logged out successfully");
        return;
      } else {
        console.error("Failed to log out");
      }
    } catch (error) {
      console.error("Error during logout:", error);
    }
    set({ isLoading: false });
    toast.error("Failed to log out");
  },
}));