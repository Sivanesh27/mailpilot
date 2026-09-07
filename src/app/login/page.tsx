'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Sparkles, ShieldCheck, Zap, Mail, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 overflow-hidden bg-background">
      {/* Subtle Background Glow Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] rounded-full bg-violet-600/10 blur-[100px] pointer-events-none" />

      {/* Top Bar with Theme Toggle */}
      <div className="absolute top-6 right-6 z-10">
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-tr from-primary to-violet-500 shadow-xl shadow-primary/30 mb-2">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Mail<span className="text-primary">Pilot</span>
          </h1>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Your Gmail client with an action-taking AI copilot that drives the real UI.
          </p>
        </div>

        {/* Error Alert if redirected from OAuth error */}
        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive">
            <p className="font-semibold">Authentication Error</p>
            <p className="mt-0.5">{error}</p>
          </div>
        )}

        {/* Card */}
        <div className="rounded-3xl border border-border bg-card/80 p-8 shadow-2xl backdrop-blur-xl space-y-5">
          <div className="space-y-3">
            {/* Real Google OAuth Login */}
            <a href="/api/auth/google/start" className="block w-full">
              <Button
                size="lg"
                className="w-full justify-center gap-3 text-sm font-semibold shadow-lg hover:shadow-primary/25 h-12"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </Button>
            </a>

            {/* Sandbox / Demo Login */}
            <a href="/api/auth/google/start?demo=true" className="block w-full">
              <Button
                variant="outline"
                size="lg"
                className="w-full justify-center gap-2 text-xs font-semibold h-11 border-border/80 hover:bg-muted/70"
              >
                <span>Explore Interactive Demo Sandbox</span>
                <ArrowRight className="h-3.5 w-3.5 text-primary" />
              </Button>
            </a>
          </div>

          <div className="pt-2 border-t border-border/60 space-y-2.5">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span>Tokens encrypted with AES-256-GCM. Never sent to browser.</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span>AI copilot shares the exact same Zustand state as UI buttons.</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>Free tier compatible: Vercel, Neon Postgres, Gemini API.</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-muted-foreground">
          Built for high-performance Gmail workflows.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginContent />
    </Suspense>
  );
}
