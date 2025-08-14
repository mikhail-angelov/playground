"use client";

import { createContext, useContext, ReactNode } from "react";

type User = any;
type AuthContextType = {
  userPromise: Promise<User | null>;
};

const UserContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  let context = useContext(UserContext);
  if (context === null) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}

export function AuthProvider({
  children,
  userPromise,
}: {
  children: ReactNode;
  userPromise: Promise<User | null>;
}) {
  return (
    <UserContext.Provider value={{ userPromise }}>
      {children}
    </UserContext.Provider>
  );
}
