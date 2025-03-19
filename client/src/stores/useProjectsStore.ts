import { create } from "zustand";
import { HOST } from "./utils";

interface Project {
  projectId: string;
  name: string;
  image: string;
}

interface ProjectsState {
  bestProjects: Project[];
  loadBestProjects: () => Promise<void>;
}

export const useProjectsStore = create<ProjectsState>((set) => ({
  bestProjects: [],
  loadBestProjects: async () => {
    try {
      const response = await fetch(`${HOST}/api/project/best`);
      if (response.ok) {
        const projects = await response.json();
        set({ bestProjects: projects });
      } else {
        console.error("Failed to load best projects:", response.statusText);
      }
    } catch (err) {
      console.error("Error loading best projects:", err);
    }
  },
}));