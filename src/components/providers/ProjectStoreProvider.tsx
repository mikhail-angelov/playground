"use client";

import { type ReactNode, createContext, useRef, useContext } from "react";
import { useStore } from "zustand";

import {
  type ProjectStore,
  createProjectStore,
} from "@/components/stores/projectStore";

export type ProjectStoreApi = ReturnType<typeof createProjectStore>;

export const ProjectStoreContext = createContext<ProjectStoreApi | undefined>(
  undefined,
);

export interface ProjectStoreProviderProps {
  children: ReactNode;
}

export const ProjectStoreProvider = ({
  children,
}: ProjectStoreProviderProps) => {
  const storeRef = useRef<ProjectStoreApi | null>(null);
  if (storeRef.current === null) {
    storeRef.current = createProjectStore();
  }

  return (
    <ProjectStoreContext.Provider value={storeRef.current}>
      {children}
    </ProjectStoreContext.Provider>
  );
};

export const useProjectStore = <T,>(
  selector: (store: ProjectStore) => T,
): T => {
  const projectStoreContext = useContext(ProjectStoreContext);

  if (!projectStoreContext) {
    throw new Error(`useProjectStore must be used within ProjectStoreProvider`);
  }

  return useStore(projectStoreContext, selector);
};
