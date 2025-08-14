"use client";
import React, { use, useActionState, useState } from "react";
import { Button } from "./ui/button";
import LinkButton from "./LinkButton";
import Link from "next/link";
import { User2, LogOut, LogIn } from "lucide-react";
import { useAuth } from "./providers/AuthProvider";
import { logout } from "@/lib/actions/auth";

const AuthButtons: React.FC = () => {
  const { userPromise } = useAuth();
  const user = use(userPromise);
  const [state, action, pending] = useActionState(logout, undefined);
  const isAuthenticated = !!user && !!user.id;

  return isAuthenticated ? (
    <>
      <LinkButton href="/profile">
        <>
          <User2 className="w-4 h-4 mr-2" />
          Profile
        </>
      </LinkButton>
      <form action={action}>
        <Button variant="outline">
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </form>
    </>
  ) : (
    <LinkButton href="/signup">
      <>
        <LogIn className="w-4 h-4 mr-2" />
        Login
      </>
    </LinkButton>
  );
};

export default AuthButtons;
