import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — How We Protect Your Data | Likeway AI",
  description: "Likeway AI Privacy Policy — how we collect, use, and protect your data under India's DPDP Act 2023. Your data is private and secure.",
  alternates: { canonical: "https://www.likeway.in/legal/privacy" },
  openGraph: {
    title: "Likeway AI Privacy Policy",
    description: "How Likeway AI collects, uses, and protects your data under DPDP Act 2023.",
    url: "https://www.likeway.in/legal/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0a0e16] text-gray-200">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="text-cyan-400 hover:text-cyan-300 text-sm mb-8 inline-block">&larr; Back to LikeWay</Link>

        <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-gray-500 text-sm mb-10">Effective Date: July 12, 2026 &middot; Last Updated: July 12, 2026</p>

        <div className="space-y-8 text-[15px] leading-relaxed text-gray-300">
          <section>
            <p>Aixphonic (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates the LikeWay AI platform. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service, in compliance with the <strong className="text-white">Digital Personal Data Protection Act, 2023 (DPDP Act)</strong> of India.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Data We Collect</h2>

            <h3 className="text-lg font-medium text-cyan-300 mb-2">A. Information You Provide</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Account Data:</strong> Name, email address, age (optional), referral source (optional)</li>
              <li><strong>Authentication Data:</strong> Password hash (never stored in plain text), Google OAuth tokens</li>
              <li><strong>Conversation Data:</strong> Prompts, AI responses, uploaded images, file attachments</li>
              <li><strong>Payment Data:</strong> Subscription plan, payment status (processed by Razorpay/Stripe — we do not store card numbers)</li>
              <li><strong>Preferences:</strong> Theme, voice character, custom instructions, persona settings</li>
            </ul>

            <h3 className="text-lg font-medium text-cyan-300 mb-2 mt-4">B. Automatically Collected</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Device Data:</strong> Browser type, operating system, device type</li>
              <li><strong>Usage Data:</strong> Pages visited, features used, message counts, session duration</li>
              <li><strong>Network Data:</strong> IP address (for rate limiting and security), approximate location (country level)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. How We Use Your Data</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Service Delivery:</strong> Process your prompts and generate AI responses</li>
              <li><strong>Account Management:</strong> Authentication, session management, subscription handling</li>
              <li><strong>Improvement:</strong> Analyze usage patterns to improve the Service (we do not train AI models on your data)</li>
              <li><strong>Security:</strong> Rate limiting, fraud prevention, abuse detection</li>
              <li><strong>Communication:</strong> Service updates, security alerts (you may opt out of non-essential communications)</li>
              <li><strong>Legal Compliance:</strong> Tax records, regulatory requirements under Indian law</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Data Flow — Third-Party AI Providers</h2>
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5 font-mono text-sm my-4">
              <div className="text-center space-y-1">
                <div className="text-cyan-400">User (You)</div>
                <div className="text-gray-600">&darr; prompt</div>
                <div className="text-blue-400">LikeWay AI Server</div>
                <div className="text-gray-600">&darr; API request</div>
                <div className="text-purple-400">Third-Party AI Providers</div>
                <div className="text-gray-600">&darr; routes to</div>
                <div className="text-gray-400">Various AI Models</div>
              </div>
            </div>
            <p>Your prompts may be processed by third-party AI providers. These providers have their own privacy policies. We disclose this data flow to you for transparency:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li><strong>AI Routing Services:</strong> Route requests to various AI models. Data is processed per their respective privacy policies.</li>
              <li><strong>Inference Providers:</strong> Provide fast AI inference and model hosting. Data is processed per their respective privacy policies.</li>
              <li><strong>Model Providers:</strong> Provide AI models and APIs. Data is processed per their respective privacy policies.</li>
            </ul>
            <p className="mt-2">We do not control how these third parties process data after the API call is complete. We recommend not sharing highly sensitive personal information in prompts.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Data Storage & Security</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Storage:</strong> Data is stored on MongoDB Atlas cloud servers (AWS region).</li>
              <li><strong>Encryption in Transit:</strong> All data is transmitted over HTTPS/TLS.</li>
              <li><strong>Encryption at Rest:</strong> MongoDB Atlas provides encryption at rest for stored data.</li>
              <li><strong>Authentication:</strong> Passwords are hashed using scrypt (Argon2-equivalent) with random salt.</li>
              <li><strong>Sessions:</strong> JWT tokens with secure, HttpOnly cookies.</li>
              <li><strong>Access Control:</strong> Strict internal access controls — only authorized personnel can access production data.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Data Retention</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Account Data:</strong> Retained while your account is active, deleted within 30 days of account deletion.</li>
              <li><strong>Conversations:</strong> Retained while your account is active, deleted within 30 days of account deletion.</li>
              <li><strong>Sessions:</strong> Expire after 30 days of inactivity.</li>
              <li><strong>Login History:</strong> Retained for 90 days for security purposes.</li>
              <li><strong>Usage Data:</strong> Aggregated and anonymized after 12 months.</li>
              <li><strong>Payment Records:</strong> Retained for 7 years as required by Indian tax law.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Your Rights Under DPDP Act 2023</h2>
            <p>As a Data Fiduciary, we respect your following rights:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li><strong>Right to Access:</strong> Request a copy of all personal data we hold about you.</li>
              <li><strong>Right to Correction:</strong> Request correction of inaccurate personal data.</li>
              <li><strong>Right to Erasure:</strong> Request deletion of your personal data and account.</li>
              <li><strong>Right to Grievance Redressal:</strong> File a complaint if your rights are not respected.</li>
              <li><strong>Right to Nominate:</strong> Nominate someone to exercise your rights in case of death or incapacity.</li>
            </ul>
            <p className="mt-2">To exercise any of these rights, contact us at <strong className="text-cyan-400">privacy@aixphonic.com</strong> or use the in-app Account Settings.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Consent</h2>
            <p>By creating an account and using LikeWay AI, you consent to:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Collection and processing of your account data for service delivery.</li>
              <li>Processing of your prompts by third-party AI providers as described in Section 3.</li>
              <li>Storage of conversations for providing conversation history features.</li>
            </ul>
            <p className="mt-2">You may withdraw consent at any time by deleting your account. Withdrawal of consent does not affect the lawfulness of processing carried out before withdrawal.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Children&apos;s Privacy</h2>
            <p>The Service is not intended for children under 13 years of age. We do not knowingly collect personal data from children under 13. If we become aware that we have collected data from a child under 13, we will delete it promptly.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Cookies</h2>
            <p>We use cookies for authentication (session tokens), preferences, and basic analytics. See our <Link href="/legal/cookies" className="text-cyan-400 hover:underline">Cookie Policy</Link> for details.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">10. Data Breach Notification</h2>
            <p>In the event of a personal data breach, we will:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Notify the Data Protection Board of India within 72 hours of becoming aware of the breach.</li>
              <li>Notify affected users without delay if the breach is likely to cause harm.</li>
              <li>Take immediate steps to contain and remediate the breach.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">11. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. Material changes will be notified via email or in-app notification at least 7 days before they take effect. The &quot;Last Updated&quot; date at the top reflects the latest revision.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">12. Contact</h2>
            <p>For privacy-related inquiries or to exercise your data rights:</p>
            <p className="mt-2">
              <strong>Aixphonic</strong><br/>
              Email: <strong className="text-cyan-400">privacy@aixphonic.com</strong><br/>
              Website: <a href="https://likeway.in" className="text-cyan-400 hover:underline">likeway.in</a><br/>
              Grievance Officer: [Name] — [Email]
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
