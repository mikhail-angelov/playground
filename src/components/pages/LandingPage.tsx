import Link from "next/link";
import Footer from "@/components/Footer";

export default async function Home() {
  return (
    <div className="min-h-screen bg-[#18191a] text-white flex flex-col font-sans">
      <header className="flex justify-between items-center px-8 py-6 border-b border-zinc-800 bg-[#23272a]">
        <h1 className="text-2xl font-bold tracking-tight">JS2Go</h1>
        <div className="flex gap-4">
          <Link
            href="/signup"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded transition-colors"
          >
            Sign up
          </Link>
          <Link
            href="/top"
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2 rounded transition-colors"
          >
            Top
          </Link>
        </div>
      </header>

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
      </main>

      <Footer />
    </div>
  );
}
