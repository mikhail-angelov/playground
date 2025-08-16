"use client";
import React, { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { Home } from "lucide-react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { get, save } from "@/lib/actions/profile";
import { toast } from "sonner";

const providers = ["deepSeek", "yandex", "openAI"];

export default function Profile() {
  const [key, setKey] = useState("");
  const [provider, setProvider] = useState(providers[0]);
  useEffect(() => {
    get().then((res) => {
      setKey(res?.key);
      setProvider(res?.provider);
    });
  }, []);
  const [state, action, isLoading] = useActionState(
    async (state: any, formData: FormData) => {
      const request = {
        key,
        provider,
      };
      const result = await save(request);
      if (result?.ok) {
        toast.success("Profile is updated!");
      }
      return result;
    },
    undefined,
  );
  return (
    <div className="flex flex-col h-screen">
      <Header
        right={
          <div className="flex items-center space-x-4">
            <Link href="/" passHref>
              <Button asChild variant="outline">
                <Home className="w-10 h-6" />
              </Button>
            </Link>
          </div>
        }
      />
      {/* <Suspense
        fallback={
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <LoaderIcon className="w-12 h-12 text-white animate-spin" />
          </div>
        }
      > */}
      <form className="flex flex-col  flex-1 p-4 space-y-4" action={action}>
        <h1 className="text-2xl font-bold mb-4">Api Profile</h1>
        <div className="w-full max-w-md space-y-4">
          <div className="flex flex-col space-y-1">
            <label htmlFor="provider" className="font-medium">
              Provider
            </label>
            <select
              id="provider"
              className="input input-bordered w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-background"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
            >
              {providers.map((provider) => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col space-y-1">
            <label htmlFor="key" className="font-medium">
              API Key
            </label>
            <input
              id="key"
              type="password"
              className="input input-bordered w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-background"
              value={key || ""}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Enter API key"
              autoComplete="off"
            />
          </div>
        </div>
        <div>
          <Button type="submit" className="">
            Save
          </Button>
        </div>
      </form>
      {/* </Suspense> */}
      <Footer />
    </div>
  );
}
