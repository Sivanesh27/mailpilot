import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Lock, EyeOff, FileText } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#090a10] text-slate-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-xs text-purple-400 hover:text-purple-300 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to MailPilot
        </Link>

        <div className="border-b border-purple-900/40 pb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Privacy Policy</h1>
              <p className="text-xs text-slate-400">Last updated: September 2026</p>
            </div>
          </div>
        </div>

        <section className="space-y-4 text-sm text-slate-300 leading-relaxed">
          <h2 className="text-lg font-semibold text-white">1. Overview</h2>
          <p>
            MailPilot (&quot;we&quot;, &quot;our&quot;, or &quot;the application&quot;) is an AI-powered webmail client designed
            to help users interact with their Gmail inbox using natural language action assistance. We take user privacy
            seriously and are committed to safeguarding personal data.
          </p>
        </section>

        <section className="space-y-4 text-sm text-slate-300 leading-relaxed">
          <h2 className="text-lg font-semibold text-white">2. Information We Access and Process</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Google Account Information:</strong> When you connect using Google OAuth 2.0, we access your name,
              email address, profile picture, and Google Subject ID to create and identify your account session.
            </li>
            <li>
              <strong>Gmail Data:</strong> With your explicit consent, MailPilot accesses your Gmail messages via the
              official Gmail REST API (<code className="text-purple-300 text-xs">gmail.modify</code> scope) solely to
              display, search, filter, quote, and send emails requested by you.
            </li>
          </ul>
        </section>

        <section className="space-y-4 text-sm text-slate-300 leading-relaxed">
          <h2 className="text-lg font-semibold text-white">3. How We Store and Protect Your Data</h2>
          <div className="rounded-xl border border-purple-900/30 bg-purple-950/20 p-4 space-y-2">
            <div className="flex items-center gap-2 text-purple-300 font-medium text-xs">
              <Lock className="h-4 w-4 text-purple-400" />
              AES-256-GCM Token Encryption
            </div>
            <p className="text-xs text-slate-400">
              Your Google OAuth access and refresh tokens are encrypted at rest using AES-256-GCM with a 96-bit
              initialization vector and a 128-bit authentication tag. Tokens are never transmitted to client-side
              browser JavaScript.
            </p>
          </div>
          <p>
            <strong>No Persistent Email Storage:</strong> MailPilot does not permanently store your email contents or
            attachments on our database servers. Messages are retrieved on-demand directly from the Gmail API during your
            authenticated session.
          </p>
        </section>

        <section className="space-y-4 text-sm text-slate-300 leading-relaxed">
          <h2 className="text-lg font-semibold text-white">4. Artificial Intelligence & Gemini API Processing</h2>
          <p>
            When you instruct the AI Copilot to analyze, filter, summarize, or compose an email, relevant context is
            processed in real time using the Google Gemini API:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-400">
            <li>Your email data is <strong>never used to train</strong> generalized AI models.</li>
            <li>We do not sell, rent, or trade your personal data to third parties or advertisers.</li>
            <li>All outgoing compose actions require explicit user confirmation before dispatch.</li>
          </ul>
        </section>

        <section className="space-y-4 text-sm text-slate-300 leading-relaxed border-t border-purple-900/40 pt-6">
          <h2 className="text-lg font-semibold text-white">5. Google API Services User Data Policy Compliance</h2>
          <p>
            MailPilot&apos;s use and transfer of information received from Google APIs adheres to the{' '}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 underline hover:text-purple-300"
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements.
          </p>
        </section>

        <section className="space-y-4 text-sm text-slate-300 leading-relaxed">
          <h2 className="text-lg font-semibold text-white">6. Data Retention & Deletion</h2>
          <p>
            You can revoke MailPilot&apos;s access at any time by logging out or revoking access via{' '}
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 underline hover:text-purple-300"
            >
              Google Account Permissions
            </a>
            . Upon disconnection, your stored OAuth tokens are purged.
          </p>
        </section>

        <div className="border-t border-purple-900/40 pt-6 text-xs text-slate-500 flex justify-between">
          <span>&copy; 2026 MailPilot. All rights reserved.</span>
          <Link href="/terms" className="hover:text-purple-400 transition-colors">
            Terms of Service
          </Link>
        </div>
      </div>
    </div>
  );
}
