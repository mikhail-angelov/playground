import React, { useEffect } from "react";
import { Home, LoaderIcon } from "lucide-react";

import Header from "@/components/Header";
import { Trans } from "@lingui/react/macro";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useProfileStore, providers } from "@/stores/useProfile";

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const api = useProfileStore((state) => state.api);
  const isLoading = useProfileStore((state) => state.isLoading);
  const loadProfile = useProfileStore((state) => state.loadProfile);
  const saveProfile = useProfileStore((state) => state.saveProfile);

  useEffect(() => {
    loadProfile();
  }, []);

  return (
    <div className="flex flex-col h-screen">
      <Header
        right={
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              className="hidden md:inline-flex"
              onClick={() => navigate("/")}
            >
              <Home className="w-4 h-4 mr-2" />
              <Trans>Home</Trans>
            </Button>
          </div>
        }
      />
      <form
        className="flex flex-col  flex-1 p-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          saveProfile();
        }}
      >
        {isLoading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <LoaderIcon className="w-12 h-12 text-white animate-spin" />
          </div>
        )}
        <h1 className="text-2xl font-bold mb-4">Api Profile</h1>
        <div className="w-full max-w-md space-y-4">
          <div className="flex flex-col space-y-1">
            <label htmlFor="provider" className="font-medium">
              <Trans>Provider</Trans>
            </label>
            <select
              id="provider"
              className="input input-bordered w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-background"
              value={api.provider || providers[0]}
              onChange={(e) =>
                useProfileStore.setState((state) => ({
                  api: { ...state.api, provider: e.target.value },
                }))
              }
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
              <Trans>API Key</Trans>
            </label>
            <input
              id="key"
              type="password"
              className="input input-bordered w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-background"
              value={api.key || ""}
              onChange={(e) =>
                useProfileStore.setState((state) => ({
                  api: { ...state.api, key: e.target.value },
                }))
              }
              placeholder="Enter API key"
              autoComplete="off"
            />
          </div>
        </div>
        <div>
          <Button type="submit" disabled={isLoading} className="">
            <Trans>Save</Trans>
          </Button>
        </div>
      </form>
      <Footer />
    </div>
  );
};

export default Profile;
