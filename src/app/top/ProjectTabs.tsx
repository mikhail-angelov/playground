import { Button } from "@/components/ui/button";
import Link from "next/link";
import React from "react";

export default function ProjectTabs() {
  return (
    <div className="flex space-x-2 m-2">
      <Link href="/top">Trends</Link>
      <Link href="/my">My Projects</Link>
    </div>
  );
}
