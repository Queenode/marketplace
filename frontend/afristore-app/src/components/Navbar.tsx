// ─────────────────────────────────────────────────────────────
// components/Navbar.tsx — Afristore Navigation (Redesigned)
// ─────────────────────────────────────────────────────────────

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useWalletContext } from "@/context/WalletContext";
import { Wallet, Store, LayoutDashboard, Menu, X } from "lucide-react";

export function Navbar() {
  const { publicKey, isConnected, isConnecting, connect, disconnect } =
    useWalletContext();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const shortKey = publicKey
    ? `${publicKey.slice(0, 4)}…${publicKey.slice(-4)}`
    : null;

  // Detect scroll for transparent → solid transition
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled
          ? "bg-midnight-900/95 backdrop-blur-xl border-b border-white/5 shadow-lg shadow-black/20"
          : "bg-transparent"
        }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-4">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group"
        >
          <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand-500 text-white text-lg shadow-md shadow-brand-500/30 group-hover:shadow-lg group-hover:shadow-brand-500/40 transition-shadow">
            🎨
          </span>
          <span className="text-xl font-display font-bold text-white tracking-tight">
            Afri<span className="text-brand-400">store</span>
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-white/60 hover:text-brand-400 transition-colors duration-300"
          >
            <Store size={16} />
            Marketplace
          </Link>
          {isConnected && (
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-white/60 hover:text-brand-400 transition-colors duration-300"
            >
              <LayoutDashboard size={16} />
              Dashboard
            </Link>
          )}
        </div>

        {/* Desktop wallet button */}
        <div className="hidden md:flex items-center gap-3">
          {isConnected ? (
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-brand-500/15 border border-brand-500/20 px-3.5 py-1.5 text-xs font-mono text-brand-300">
                {shortKey}
              </span>
              <button
                onClick={disconnect}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-all duration-300"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={connect}
              disabled={isConnecting}
              className="flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/25 hover:bg-brand-600 hover:shadow-lg hover:shadow-brand-500/35 disabled:opacity-60 transition-all duration-300"
            >
              <Wallet size={16} />
              {isConnecting ? "Connecting…" : "Connect Wallet"}
            </button>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg bg-white/5 text-white/70 hover:bg-white/10 transition-colors"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile drawer */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-500 ${mobileOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0"
          }`}
      >
        <div className="bg-midnight-900/98 backdrop-blur-xl border-t border-white/5 px-4 py-6 space-y-4">
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2 text-white/70 hover:text-brand-400 transition-colors py-2"
          >
            <Store size={18} />
            Marketplace
          </Link>
          {isConnected && (
            <Link
              href="/dashboard"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 text-white/70 hover:text-brand-400 transition-colors py-2"
            >
              <LayoutDashboard size={18} />
              Dashboard
            </Link>
          )}

          <div className="pt-3 border-t border-white/5">
            {isConnected ? (
              <div className="space-y-3">
                <p className="text-xs text-white/40 font-mono">{shortKey}</p>
                <button
                  onClick={() => {
                    disconnect();
                    setMobileOpen(false);
                  }}
                  className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 text-sm text-white/70 hover:bg-white/10 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  connect();
                  setMobileOpen(false);
                }}
                disabled={isConnecting}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-brand-500 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                <Wallet size={16} />
                {isConnecting ? "Connecting…" : "Connect Wallet"}
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
