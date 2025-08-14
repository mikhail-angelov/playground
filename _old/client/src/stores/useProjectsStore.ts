import { create } from "zustand";
import { toast } from "sonner"; // Import the toast function

interface Project {
  projectId: string;
  name: string;
  image: string;
}

interface ProjectsState {
  projects: Project[];
  loadProjects: (my?: boolean) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  isLoading: boolean;
  my?: boolean;
}

export const useProjectsStore = create<ProjectsState>((set, get) => ({
  projects: [],
  isLoading: false,
  my: false,
  loadProjects: async (my?: boolean) => {
    try {
      set({ isLoading: true,my: !!my });
      const response = await fetch(
        my ? "/api/project/my" : "/api/project/best"
      );
      if (response.ok) {
        const projects = await response.json();
        set({ projects });
      } else {
        console.error("Failed to load projects:", response.statusText);
        toast.error(`Failed to load projects: ${response.statusText}`); // Show error toast
      }
    } catch (err) {
      console.error("Error loading projects:", err);
      toast.error("Error loading projects"); // Show error toast
    }
    set({ isLoading: false });
  },
  deleteProject: async (projectId: string) => {
    try {
      const { my } = get();
      set({ isLoading: true });
      const response = await fetch(`/api/project/${projectId}`, {
        method: "DELETE", // Correctly specify the HTTP method
        body: JSON.stringify({ my }),
      });
      if (response.ok) {
        const projects = await response.json();
        set({ projects });
        toast.success("Project deleted successfully!"); // Show success toast
      } else {
        console.error("Failed to delete project:", response.statusText);
        toast.error(`Failed to delete project: ${response.statusText}`); // Show error toast
      }
    } catch (err) {
      console.error("Error deleting project:", err);
      toast.error("Error deleting project"); // Show error toast
    } finally {
      set({ isLoading: false });
    }
  },
}));
