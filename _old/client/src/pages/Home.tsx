import React from "react";
import { Link } from "react-router-dom";

const SSO_LOGIN_URL = "/api/auth/sso/login"; // Adjust as needed for your SSO provider

const Home: React.FC = () => {
  return (
    <>
      {/* SEO Meta Tags */}
      <head>
        <title>Playground – Creative Coding, Collaboration, and SSO</title>
        <meta
          name="description"
          content="Discover Playground: a collaborative, SSO-ready platform for creative coding and sharing projects. Explore trending work, sign in securely, or browse as a guest."
        />
        <meta
          property="og:title"
          content="Playground – Creative Coding, Collaboration, and SSO"
        />
        <meta
          property="og:description"
          content="Discover Playground: a collaborative, SSO-ready platform for creative coding and sharing projects. Explore trending work, sign in securely, or browse as a guest."
        />
        <meta property="og:image" content="/logo192.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100">
        <header className="w-full border-b bg-white/80 backdrop-blur sticky top-0 z-10">
          <div className="max-w-5xl mx-auto flex items-center justify-between py-4 px-6">
            <div className="flex items-center gap-3">
              <img
                src="/logo192.png"
                alt="Playground Logo"
                className="w-12 h-12"
              />
              <span className="text-2xl font-bold text-indigo-700 tracking-tight">
                Playground
              </span>
            </div>
            <nav className="flex gap-4">
              <a
                href={SSO_LOGIN_URL}
                className="text-indigo-700 font-semibold hover:underline"
              >
                Sign in
              </a>
              <Link
                to="/top"
                className="text-gray-600 hover:text-indigo-700 font-semibold"
              >
                Explore
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center px-4">
          <section className="w-full max-w-3xl text-center mt-16 mb-12">
            <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-4 leading-tight">
              Discover, Create,{" "}
              <span className="text-indigo-600">Collaborate</span>
            </h1>
            <p className="text-xl text-gray-700 mb-8">
              Playground is your creative coding hub. Sign in with SSO for a
              secure experience, or browse trending projects as a guest.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <a
                href={SSO_LOGIN_URL}
                className="px-8 py-3 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 transition font-semibold text-lg"
              >
                Sign in with SSO
              </a>
              <Link
                to="/top"
                className="px-8 py-3 border border-indigo-600 text-indigo-700 rounded-lg hover:bg-indigo-50 transition font-semibold text-lg"
              >
                Continue as Guest
              </Link>
            </div>
            <form className="max-w-xl mx-auto flex items-center bg-white rounded-lg shadow px-4 py-2 border border-gray-200">
              <input
                type="search"
                placeholder="Search projects, creators, or tags…"
                className="flex-1 px-3 py-2 outline-none bg-transparent text-lg"
                aria-label="Search projects"
                disabled
              />
              <button
                type="submit"
                className="ml-2 px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 font-semibold"
                disabled
                tabIndex={-1}
              >
                Search
              </button>
            </form>
          </section>
          <section className="w-full max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-left">
              Trending Projects
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {/* Placeholder cards for trending projects */}
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition p-5 flex flex-col"
                >
                  <div className="h-32 bg-gradient-to-br from-indigo-100 to-blue-100 rounded mb-4"></div>
                  <h3 className="font-semibold text-lg mb-1">
                    Project Title {i}
                  </h3>
                  <p className="text-gray-500 text-sm mb-2">by Creator {i}</p>
                  <div className="flex gap-2 mt-auto">
                    <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-medium">
                      #tag
                    </span>
                    <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-medium">
                      #creative
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center mt-8">
              <Link
                to="/top"
                className="inline-block px-6 py-2 border border-indigo-600 text-indigo-700 rounded-lg hover:bg-indigo-50 transition font-semibold text-lg"
              >
                See All Projects
              </Link>
            </div>
          </section>
        </main>
        <footer className="w-full mt-16 py-8 border-t text-center text-gray-400 text-xs bg-white/70">
          &copy; {new Date().getFullYear()} Playground. All rights reserved.
          &middot;{" "}
          <a href="https://github.com/" className="hover:underline">
            GitHub
          </a>
        </footer>
      </div>
    </>
  );
};

export default Home;
