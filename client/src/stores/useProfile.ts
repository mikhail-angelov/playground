import { create } from "zustand";
import { toast } from "sonner"; // Import the toast function

interface Api {
  provider: string;
  key: string;
}

export const providers = ["deepSeek", "yandex", "openAI"];

interface ProfileState {
  api: Api;
  loadProfile: () => Promise<void>;
  saveProfile: () => Promise<void>;
  isLoading: boolean;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  api: {
    provider: "",
    key: "",
  },
  isLoading: false,
  loadProfile: async () => {
    try {
      set({ isLoading: true });
      const response = await fetch("/api/profile");
      if (response.ok) {
        const api = (await response.json()) || {
          provider: providers[0],
          key: "",
        };
        set({ api });
      } else {
        console.error("Failed to load profile:", response.statusText);
        toast.error(`Failed to load profile: ${response.statusText}`); // Show error toast
      }
    } catch (err) {
      console.error("Error loading profile:", err);
      toast.error("Error loading profile"); // Show error toast
    }
    set({ isLoading: false });
  },
  saveProfile: async () => {
    const { api } = get();
    try {
      set({ isLoading: true });
      const response = await fetch(`/api/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(api),
      });
      if (response.ok) {
        toast.success("Profile is saved successfully!"); // Show success toast
      } else {
        console.error("Failed to save profile:", response.statusText);
        toast.error(`Failed to save profile: ${response.statusText}`); // Show error toast
      }
    } catch (err) {
      console.error("Error save profile:", err);
      toast.error("Error save profile"); // Show error toast
    } finally {
      set({ isLoading: false });
    }
  },
}));
