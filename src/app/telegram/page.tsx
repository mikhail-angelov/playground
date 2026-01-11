"use client";

import React, { useEffect, useState } from "react";
import Script from "next/script";
import Link from "next/link";
import { Loader2, ExternalLink, ShieldAlert, Cpu } from "lucide-react";
import { getTelegramProjects } from "@/lib/actions/telegram";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import type { ProjectTelegramDto } from "@/lib/actions/telegram";

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
          };
        };
        ready: () => void;
        expand: () => void;
        close: () => void;
        MainButton: {
          text: string;
          show: () => void;
          hide: () => void;
          onClick: (fn: () => void) => void;
        };
      };
    };
  }
}

export default function TelegramPage() {
  const [projects, setProjects] = useState<ProjectTelegramDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [telegramNik, setTelegramNik] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDebug, setIsDebug] = useState(false);
  const [debugNik, setDebugNik] = useState("");

  const fetchProjects = async (nik: string) => {
    setLoading(true);
    try {
      const data = await getTelegramProjects(nik);
      setProjects(data as ProjectTelegramDto[]);
      if (data.length === 0) {
        setError(`No projects found for Telegram user: ${nik}. Make sure you saved this username in your profile and tagged projects with "telegram".`);
      } else {
        setError(null);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch projects.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initTWA = () => {
      if (window.Telegram?.WebApp) {
        const webapp = window.Telegram.WebApp;
        webapp.ready();
        webapp.expand();

        const user = webapp.initDataUnsafe?.user;
        if (user?.username) {
          const nik = user.username.startsWith("@") ? user.username : `@${user.username}`;
          setTelegramNik(nik);
          fetchProjects(nik);
        } else {
          setError("Telegram username not found. Make sure you have a username set in Telegram.");
        }
      }
    };

    // Check if SDK already loaded
    if (window.Telegram?.WebApp) {
      initTWA();
    }
  }, []);

  const handleDebugFetch = (e: React.FormEvent) => {
    e.preventDefault();
    if (debugNik) {
      const nik = debugNik.startsWith("@") ? debugNik : `@${debugNik}`;
      setTelegramNik(nik);
      fetchProjects(nik);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1115] text-white flex flex-col font-sans selection:bg-blue-500/30">
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="beforeInteractive"
        onLoad={() => {
          // Trigger init if script loads after component mount
          if (window.Telegram?.WebApp && !telegramNik) {
            const user = window.Telegram.WebApp.initDataUnsafe?.user;
            if (user?.username) {
              const nik = user.username.startsWith("@") ? user.username : `@${user.username}`;
              setTelegramNik(nik);
              fetchProjects(nik);
            }
          }
        }}
      />

      <Header
        center={
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Telegram Apps
          </h1>
        }
        right={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDebug(!isDebug)}
            className="text-zinc-500 hover:text-white"
          >
            <Cpu className="w-4 h-4" />
          </Button>
        }
      />

      <main className="flex-1 flex flex-col p-6 max-w-2xl mx-auto w-full">
        {isDebug && (
          <div className="mb-8 p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl backdrop-blur-md">
            <h2 className="text-sm font-semibold mb-3 text-zinc-400 uppercase tracking-wider">Debug Mode</h2>
            <form onSubmit={handleDebugFetch} className="flex gap-2">
              <input
                type="text"
                placeholder="Enter Telegram Username (e.g. @mikhail)"
                className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                value={debugNik}
                onChange={(e) => setDebugNik(e.target.value)}
              />
              <Button type="submit" size="sm">Fetch</Button>
            </form>
          </div>
        )}

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            <p className="text-zinc-400 animate-pulse">Scanning your projects...</p>
          </div>
        ) : error && projects.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
              <ShieldAlert className="w-8 h-8 text-red-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">No Apps Found</h2>
              <p className="text-zinc-400 max-w-xs mx-auto">
                {error}
              </p>
            </div>
            {telegramNik && (
              <p className="text-xs text-zinc-600 font-mono">User: {telegramNik}</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-6 auto-rows-fr">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={project.url}
                className="group relative aspect-square bg-[#1a1d23] rounded-2xl border border-zinc-800 overflow-hidden transition-all duration-300 hover:scale-105 hover:border-blue-500/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.2)]"
              >
                {project.image ? (
                  <img
                    src={project.image}
                    alt={project.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-950 flex items-center justify-center">
                    <span className="text-3xl font-bold text-zinc-700 group-hover:text-blue-500/50 transition-colors">
                      {project.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium truncate pr-2">{project.name}</span>
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </div>
                </div>

                {/* Visual Label for always-on name if image allows */}
                {!project.image && (
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-[10px] text-zinc-500 text-center truncate">{project.name}</p>
                  </div>
                )}
              </Link>
            ))}

            {/* Fill the grid to 15 slots if requested (3x5) */}
            {Array.from({ length: Math.max(0, 15 - projects.length) }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="aspect-square bg-[#1a1d23]/30 rounded-2xl border border-dashed border-zinc-800/50 flex items-center justify-center group"
              >
                <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-800 group-hover:border-zinc-700 group-hover:text-zinc-700 transition-colors">
                  ?
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
