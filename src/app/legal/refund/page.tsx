import Link from "next/link";

export const metadata = {
  title: "Refund & Subscription Policy — Cancellation & Billing | Likeway AI",
  description: "Likeway AI Refund and Subscription Policy — cancellations, refunds, and billing terms for AI assistant plans.",
  alternates: { canonical: "https://www.likeway.in/legal/refund" },
};

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-[#0a0e16] text-gray-200">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="text-cyan-400 hover:text-cyan-300 text-sm mb-8 inline-block">&larr; Back to LikeWay</Link>

        <h1 className="text-3xl font-bold text-white mb-2">Refund & Subscription Policy</h1>
        <p className="text-gray-500 text-sm mb-10">Effective Date: July 12, 2026 &middot; Last Updated: July 12, 2026</p>

        <div className="space-y-8 text-[15px] leading-relaxed text-gray-300">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Subscription Plans</h2>
            <p>LikeWay AI offers the following subscription tiers:</p>
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-sm border border-gray-700/50 rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-gray-800/50 text-left">
                    <th className="px-4 py-3 text-white font-semibold">Plan</th>
                    <th className="px-4 py-3 text-white font-semibold">Price (INR/month)</th>
                    <th className="px-4 py-3 text-white font-semibold">Billing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/30">
                  <tr><td className="px-4 py-3">Core (Free)</td><td className="px-4 py-3">Free</td><td className="px-4 py-3">N/A</td></tr>
                  <tr><td className="px-4 py-3">Go</td><td className="px-4 py-3">Rs. 299</td><td className="px-4 py-3">Monthly, auto-renewing</td></tr>
                  <tr><td className="px-4 py-3">Plus</td><td className="px-4 py-3">Rs. 799</td><td className="px-4 py-3">Monthly, auto-renewing</td></tr>
                  <tr><td className="px-4 py-3">Pro</td><td className="px-4 py-3">Rs. 1,999</td><td className="px-4 py-3">Monthly, auto-renewing</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Auto-Renewal</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>All paid subscriptions automatically renew at the end of each billing cycle.</li>
              <li>You will be charged the same amount unless you cancel before the renewal date.</li>
              <li>Renewal reminders are sent via email 3 days before renewal.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Cancellation</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>You may cancel your subscription at any time from <strong>Settings &rarr; Subscription &rarr; Cancel Plan</strong>.</li>
              <li>Upon cancellation, your access to premium features continues until the end of the current billing period.</li>
              <li>After the billing period ends, your account reverts to the free Core plan.</li>
              <li>No partial refunds are provided for unused time in the current billing period.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Refund Policy</h2>

            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-4">
              <p className="text-emerald-300 font-semibold text-sm">7-DAY REFUND WINDOW</p>
              <p className="text-emerald-100/80 mt-1">If you are unsatisfied with the Service, you may request a full refund within 7 days of your initial subscription purchase.</p>
            </div>

            <h3 className="text-lg font-medium text-cyan-300 mb-2">Eligible for Refund</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>First-time subscription within 7 days of purchase.</li>
              <li>Service was unavailable for a significant portion of the billing period (more than 48 hours of downtime).</li>
              <li>Charged incorrectly or duplicate charge.</li>
            </ul>

            <h3 className="text-lg font-medium text-red-300 mb-2 mt-4">Not Eligible for Refund</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Refund requests made after 7 days of purchase.</li>
              <li>Renewal charges (you must cancel before renewal to avoid future charges).</li>
              <li>Dissatisfaction with AI-generated content quality.</li>
              <li>Account suspended for Terms of Service violations.</li>
              <li>Partial period refunds for mid-cycle cancellations.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. How to Request a Refund</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Email <strong className="text-cyan-400">billing@aixphonic.com</strong> with your registered email and reason.</li>
              <li>Refund requests are processed within 5-7 business days.</li>
              <li>Refunds are credited to the original payment method.</li>
              <li>Razorpay/Stripe processing fees may be deducted where applicable.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Usage Limits</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Core (Free):</strong> 500 messages per day, 2 AI models.</li>
              <li><strong>Go / Plus / Pro:</strong> Unlimited messages (fair use policy applies).</li>
              <li>Excessive automated usage or abuse may result in rate limiting or account suspension.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Price Changes</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>We may change subscription prices with at least 30 days advance notice.</li>
              <li>Existing subscribers will be notified and can cancel before the new price takes effect.</li>
              <li>Price changes do not affect the current billing period.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. GST & Invoicing</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>All prices are inclusive of applicable GST (Goods and Services Tax).</li>
              <li>GST-compliant invoices are generated automatically and available in your account settings.</li>
              <li>Invoices are issued by Aixphonic Pvt Ltd.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Contact</h2>
            <p>
              <strong>Aixphonic</strong><br/>
              Billing: <strong className="text-cyan-400">billing@aixphonic.com</strong><br/>
              Support: <strong className="text-cyan-400">support@aixphonic.com</strong><br/>
              Website: <a href="https://likeway.in" className="text-cyan-400 hover:underline">likeway.in</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
