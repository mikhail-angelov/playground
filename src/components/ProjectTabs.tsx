import { cn } from "@/lib/utils";
import Link from "next/link";
import React from "react";

export default function ProjectTabs({ active }: { active: string }) {
  return (
    <nav aria-label="Project collections" className="flex space-x-2 p-1 px-2 bg-gray-800 rounded-md">
      <Link
        href="/top"
        aria-current={active === "top" ? "page" : undefined}
        className={cn("px-2 rounded-md text-gray-400", {
          "border-1 border-gray-500 bg-black text-white": active === "top",
        })}
        key={0}
      >
        Trends
      </Link>
      <Link
        href="/my"
        aria-current={active === "my" ? "page" : undefined}
        className={cn("px-2 rounded-md text-gray-400", {
          "border-1 border-gray-500 bg-black text-white": active === "my",
        })}
        key={1}
      >
        My Projects
      </Link>
    </nav>
  );
}
