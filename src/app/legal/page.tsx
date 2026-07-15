import Link from "next/link";

export const metadata = {
  title: "Legal",
  description: "LikeWay AI Legal Documents — Terms, Privacy, Cookies, Refund policies.",
};

const docs = [
  { title: "Terms of Service", desc: "Usage rules, limitations, and legal terms", href: "/legal/terms", icon: "📜" },
  { title: "Privacy Policy", desc: "How we collect, use, and protect your data (DPDP Act 2023)", href: "/legal/privacy", icon: "🔒" },
  { title: "Cookie Policy", desc: "Cookies, local storage, and tracking technologies", href: "/legal/cookies", icon: "🍪" },
  { title: "Refund & Subscription Policy", desc: "Cancellations, refunds, billing, and GST", href: "/legal/refund", icon: "💳" },
];

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-[#0a0e16] text-gray-200">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="text-cyan-400 hover:text-cyan-300 text-sm mb-8 inline-block">&larr; Back to LikeWay</Link>

        <h1 className="text-3xl font-bold text-white mb-2">Legal Documents</h1>
        <p className="text-gray-500 text-sm mb-10">Aixphonic Pvt Ltd — LikeWay AI (likeway.in)</p>

        <div className="space-y-4">
          {docs.map((doc) => (
            <Link
              key={doc.href}
              href={doc.href}
              className="block p-5 rounded-xl border border-gray-700/50 bg-gray-800/30 hover:bg-gray-800/60 hover:border-cyan-500/30 transition-all duration-200 group"
            >
              <div className="flex items-start gap-4">
                <span className="text-2xl mt-0.5">{doc.icon}</span>
                <div>
                  <h2 className="text-lg font-semibold text-white group-hover:text-cyan-300 transition-colors">{doc.title}</h2>
                  <p className="text-gray-400 text-sm mt-1">{doc.desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800 text-sm text-gray-500 space-y-1">
          <p><strong className="text-gray-400">Data Fiduciary:</strong> Aixphonic Pvt Ltd</p>
          <p><strong className="text-gray-400">Grievance Officer:</strong> <a href="mailto:legal@aixphonic.com" className="text-cyan-400 hover:underline">legal@aixphonic.com</a></p>
          <p><strong className="text-gray-400">Compliance:</strong> DPDP Act 2023, IT Act 2000</p>
        </div>
      </div>
    </div>
  );
}
