import { create } from "zustand";

interface AuthState {
  isAuthenticated: boolean;
  email?: string;
  login: (email: string) => Promise<"success" | "error">;
  checkAuthStatus: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  email: '',
  login: async (email: string) => {
    try {
      const response = await fetch('/api/auth', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
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
      const response = await fetch('/api/auth/validate', {
        method: "GET",
        credentials: "include", // Include cookies in the request
      });

      if (response.ok) {
        const { user } = await response.json();
        set({ isAuthenticated: true, email: user.email });
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
      const response = await fetch('/api/auth/logout', {
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