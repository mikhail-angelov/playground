import TopPage from "./top/page";
import LandingPage from "@/components/pages/LandingPage";
import { getIsAuthenticated } from "@/lib/actions/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const isAuthenticated = await getIsAuthenticated();

  return isAuthenticated ? <TopPage /> : <LandingPage />;
}
