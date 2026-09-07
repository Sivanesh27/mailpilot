import React from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, CheckCircle2 } from 'lucide-react';

export default function TermsOfServicePage() {
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
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Terms of Service</h1>
              <p className="text-xs text-slate-400">Last updated: September 2026</p>
            </div>
          </div>
        </div>

        <section className="space-y-4 text-sm text-slate-300 leading-relaxed">
          <h2 className="text-lg font-semibold text-white">1. Acceptance of Terms</h2>
          <p>
            By accessing or using MailPilot (&quot;the Service&quot;), you agree to be bound by these Terms of Service. If you
            do not agree to these terms, please do not use the Service.
          </p>
        </section>

        <section className="space-y-4 text-sm text-slate-300 leading-relaxed">
          <h2 className="text-lg font-semibold text-white">2. Description of Service</h2>
          <p>
            MailPilot is a web-based email client integrating the Google Gmail API with Google Gemini artificial
            intelligence to provide assistive inbox navigation, filtering, search, and message composition.
          </p>
        </section>

        <section className="space-y-4 text-sm text-slate-300 leading-relaxed">
          <h2 className="text-lg font-semibold text-white">3. User Responsibilities & Acceptable Use</h2>
          <p>You agree not to use MailPilot to:</p>
          <ul className="list-disc pl-5 space-y-1 text-slate-400">
            <li>Send unsolicited bulk emails, spam, phishing schemes, or malicious software.</li>
            <li>Violate Google&apos;s Terms of Service or Google Workspace Acceptable Use Policies.</li>
            <li>Attempt to reverse-engineer, exploit, or bypass authentication or token encryption mechanisms.</li>
          </ul>
        </section>

        <section className="space-y-4 text-sm text-slate-300 leading-relaxed">
          <h2 className="text-lg font-semibold text-white">4. Human Confirmation on Mail Dispatch</h2>
          <p>
            MailPilot includes safety guardrails: AI-generated email drafts require explicit confirmation from you before
            they are dispatched. You remain solely responsible for the contents and recipients of any emails sent from your
            connected Gmail account.
          </p>
        </section>

        <section className="space-y-4 text-sm text-slate-300 leading-relaxed">
          <h2 className="text-lg font-semibold text-white">5. Disclaimer of Warranties & Limitation of Liability</h2>
          <p>
            The Service is provided &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; without warranties of any kind. Under no circumstances
            shall MailPilot or its authors be liable for any indirect, incidental, or consequential damages resulting from
            use of or inability to use the service.
          </p>
        </section>

        <div className="border-t border-purple-900/40 pt-6 text-xs text-slate-500 flex justify-between">
          <span>&copy; 2026 MailPilot. All rights reserved.</span>
          <Link href="/privacy" className="hover:text-purple-400 transition-colors">
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
