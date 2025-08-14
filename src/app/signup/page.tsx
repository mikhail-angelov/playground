"use client";
import React, { useState, useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoaderIcon } from "lucide-react";
import { login } from "@/lib/actions/auth";
import { toast } from "sonner";

export default function SignUpPage() {
  const [email, setEmail] = useState("");

  const [state, action, isLoading] = useActionState(
    async (state: any, formData: FormData) => {
      const result = await login(formData.get("email") as string);
      if (result?.ok) {
        toast.success("Check your email for the login link!");
      }
      return result;
    },
    undefined,
  );

  return (
    <div className="min-h-screen bg-[#18191a] text-white flex flex-col items-center justify-center font-sans">
      {isLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-500">
          <LoaderIcon className="w-12 h-12 text-white animate-spin" />
        </div>
      )}
      <header className="w-full flex justify-between items-center px-8 py-6 border-b border-zinc-800 bg-[#23272a]">
        <Link href="/" legacyBehavior>
          <h1 className="text-2xl font-bold tracking-tight">JS2Go</h1>
        </Link>
        <div className="flex gap-4">
          <Link
            href="/top"
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2 rounded transition-colors"
          >
            Top
          </Link>
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 w-full">
        <section className="max-w-md w-full text-center bg-[#23272a] rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-2">Sign up for JS2Go</h2>
          <p className="mb-6 text-zinc-300">
            Enter your email address to create your account. We'll send you a
            magic link to sign in securely.
          </p>

          <form className="flex flex-col gap-4" action={action}>
            <div className="flex gap-2">
              <Label htmlFor="email" className="text-right">
                Email:
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="col-span-3"
              />
            </div>
            {!!state?.error && <p className="text-red-600">{state?.error}</p>}
            <Button type="submit">Send</Button>
          </form>
        </section>
      </main>
      <Footer />
    </div>
  );
}
