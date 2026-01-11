import Link from "next/link";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { getIsAuthenticated } from "@/lib/actions/auth";
import { Image as ImageIcon, Box as BoxIcon } from "lucide-react";

export default async function Home() {
  const isAuthenticated = await getIsAuthenticated();
  return (
    <div className="min-h-screen bg-[#18191a] text-white flex flex-col font-sans">
      <Header
        right={
          <div className="flex gap-4">
            {!isAuthenticated && (
              <Link
                href="/signup"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded transition-colors"
              >
                Sign up
              </Link>
            )}
            <Link
              href="/top"
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2 rounded transition-colors"
            >
              Top
            </Link>
          </div>
        }
      />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <section className="max-w-xl w-full text-center">
          <h2 className="text-3xl font-bold mb-4">
            Create, Share, and Discover Frontend Projects
          </h2>
          <p className="text-lg mb-8 text-zinc-300">
            JS2Go is your online playground for web development. Instantly
            build, preview, and share HTML, CSS, and JavaScript projects.
            Explore trending projects, get inspired, and join a creative coding
            community.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link
              href="/project/new"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded transition-colors"
            >
              Started New Project
            </Link>
            <Link
              href="/top"
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded transition-colors"
            >
              Explore Top Projects
            </Link>
          </div>
          <div className="flex flex-col gap-2 items-center mt-6">
            <span className="text-zinc-400 text-sm">
              No account required to browse. Sign up to save your work and join
              the community!
            </span>
          </div>
        </section>

        {/* Predefined Playgrounds Section */}
        <section className="max-w-2xl w-full mt-16">
          <h3 className="text-2xl font-bold mb-8 text-center">
            Predefined Playgrounds
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {/* First Row */}
            <Link
              href="/json"
              className="bg-zinc-800 hover:bg-zinc-700 text-white font-semibold p-6 rounded-lg transition-colors flex flex-col items-center justify-center gap-3"
            >
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">{`{}`}</span>
              </div>
              <span className="text-lg">JSON</span>
            </Link>
            <Link
              href="/md"
              className="bg-zinc-800 hover:bg-zinc-700 text-white font-semibold p-6 rounded-lg transition-colors flex flex-col items-center justify-center gap-3"
            >
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">MD</span>
              </div>
              <span className="text-lg">Markdown</span>
            </Link>
            {/* Second Row */}
            <Link
              href="/dayjs"
              className="bg-zinc-800 hover:bg-zinc-700 text-white font-semibold p-6 rounded-lg transition-colors flex flex-col items-center justify-center gap-3"
            >
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                <img src="/dayjs.png" alt="Day.js" className="w-8 h-8" />
              </div>
              <span className="text-lg">Day.js</span>
            </Link>
            <Link
              href="/lodash"
              className="bg-zinc-800 hover:bg-zinc-700 text-white font-semibold p-6 rounded-lg transition-colors flex flex-col items-center justify-center gap-3"
            >
              <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
                <img src="/lodash.png" alt="Lodash" className="w-8 h-8" />
              </div>
              <span className="text-lg">Lodash</span>
            </Link>
            <Link
              href="/image"
              className="bg-zinc-800 hover:bg-zinc-700 text-white font-semibold p-6 rounded-lg transition-colors flex flex-col items-center justify-center gap-3"
            >
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-white" />
              </div>
              <span className="text-lg">Image Editor</span>
            </Link>
            <Link
              href="/3d"
              className="bg-zinc-800 hover:bg-zinc-700 text-white font-semibold p-6 rounded-lg transition-colors flex flex-col items-center justify-center gap-3"
            >
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                <BoxIcon className="w-8 h-8 text-white" />
              </div>
              <span className="text-lg">3D View</span>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
