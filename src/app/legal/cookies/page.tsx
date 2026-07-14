import Link from "next/link";

export const metadata = {
  title: "Cookie Policy — How We Use Cookies | Likeway AI",
  description: "Likeway AI Cookie Policy — how we use cookies and tracking technologies to improve your AI assistant experience.",
  alternates: { canonical: "https://www.likeway.in/legal/cookies" },
};

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-[#0a0e16] text-gray-200">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="text-cyan-400 hover:text-cyan-300 text-sm mb-8 inline-block">&larr; Back to LikeWay</Link>

        <h1 className="text-3xl font-bold text-white mb-2">Cookie Policy</h1>
        <p className="text-gray-500 text-sm mb-10">Effective Date: July 12, 2026 &middot; Last Updated: July 12, 2026</p>

        <div className="space-y-8 text-[15px] leading-relaxed text-gray-300">
          <section>
            <p>LikeWay AI uses cookies and similar technologies to provide, secure, and improve our Service. This Cookie Policy explains what cookies we use and why.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. What Are Cookies?</h2>
            <p>Cookies are small text files stored on your device when you visit a website. They help the site remember your preferences, authenticate your session, and understand how you use the service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Cookies We Use</h2>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-gray-700/50 rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-gray-800/50 text-left">
                    <th className="px-4 py-3 text-white font-semibold">Cookie</th>
                    <th className="px-4 py-3 text-white font-semibold">Type</th>
                    <th className="px-4 py-3 text-white font-semibold">Purpose</th>
                    <th className="px-4 py-3 text-white font-semibold">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/30">
                  <tr>
                    <td className="px-4 py-3 font-mono text-cyan-300">lw_at</td>
                    <td className="px-4 py-3">Essential</td>
                    <td className="px-4 py-3">Authentication — access token</td>
                    <td className="px-4 py-3">7 days</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono text-cyan-300">lw_rt</td>
                    <td className="px-4 py-3">Essential</td>
                    <td className="px-4 py-3">Authentication — refresh token</td>
                    <td className="px-4 py-3">30 days</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono text-cyan-300">lw_theme</td>
                    <td className="px-4 py-3">Functional</td>
                    <td className="px-4 py-3">Remembers dark/light mode preference</td>
                    <td className="px-4 py-3">1 year</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono text-cyan-300">lw_voice</td>
                    <td className="px-4 py-3">Functional</td>
                    <td className="px-4 py-3">Remembers selected voice character</td>
                    <td className="px-4 py-3">1 year</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono text-cyan-300">google_oauth_state</td>
                    <td className="px-4 py-3">Essential</td>
                    <td className="px-4 py-3">CSRF protection during Google login</td>
                    <td className="px-4 py-3">5 minutes</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. What We Do NOT Use</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>No advertising cookies.</strong> We do not serve ads or use ad trackers.</li>
              <li><strong>No third-party analytics cookies.</strong> We use server-side usage tracking, not browser-based analytics like Google Analytics.</li>
              <li><strong>No cross-site tracking.</strong> We do not track you across other websites.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Local Storage</h2>
            <p>We use browser <code className="bg-white/10 px-1.5 py-0.5 rounded text-cyan-300 text-sm">localStorage</code> to store:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li><strong>lw_user_cache:</strong> Cached user profile for instant UI loading (cleared on logout).</li>
              <li><strong>gemma_memory:</strong> Custom instructions you set (persists across sessions).</li>
              <li><strong>gemma_userId:</strong> User ID for anonymous sessions.</li>
              <li><strong>likeway_recent_chats:</strong> Cached conversation list for offline fallback.</li>
            </ul>
            <p className="mt-2">All localStorage data is stored only in your browser and is cleared when you log out or clear your browser data.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Managing Cookies</h2>
            <p>You can control cookies through:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li><strong>Browser Settings:</strong> Most browsers allow you to block or delete cookies. Note: blocking essential cookies will prevent login and core functionality.</li>
              <li><strong>In-App:</strong> Clear your conversation history and local data via Settings.</li>
              <li><strong>Account Deletion:</strong> Deleting your account removes all server-side data.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Changes to This Policy</h2>
            <p>We may update this Cookie Policy periodically. Changes will be posted on this page with an updated date.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Contact</h2>
            <p>
              <strong>Aixphonic</strong><br/>
              Email: <strong className="text-cyan-400">privacy@aixphonic.com</strong><br/>
              Website: <a href="https://likeway.in" className="text-cyan-400 hover:underline">likeway.in</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
