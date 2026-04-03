import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | CareBee",
  description:
    "How CareBee handles your health and care data. UK GDPR compliant, EU hosted, your data stays yours.",
};

export default function PrivacyPage() {
  return (
    <div className="bg-warmstone-50 min-h-screen">
      <style>{`
        @media print {
          nav, .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          a { color: inherit !important; text-decoration: none !important; }
        }
      `}</style>

      <div className="max-w-[720px] mx-auto px-4 py-12 md:py-16">
        {/* Back link */}
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-warmstone-500 hover:text-warmstone-900 transition-colors mb-8"
        >
          <ChevronLeft size={16} />
          Back to CareBee
        </Link>

        {/* Page title */}
        <h1 className="text-3xl font-bold text-warmstone-900 mb-1">
          Privacy Policy
        </h1>
        <p className="text-sm text-warmstone-500 mb-8 border-b border-warmstone-200 pb-8">
          Last updated: 23 March 2026
        </p>

        {/* Plain-English summary */}
        <div className="mb-10 flex flex-col gap-1">
          <p className="text-lg font-bold text-warmstone-900 mb-1">Your health information stays yours. Always.</p>
          <p className="text-sm text-warmstone-600 leading-relaxed mb-6">
            We built CareBee to help you manage health records, medications, and appointments, not to collect your data. Here is exactly how we protect it.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="bg-warmstone-white border border-warmstone-200 rounded-xl p-4">
              <p className="text-sm font-bold text-warmstone-900 mb-1">Stored in the UK</p>
              <p className="text-sm text-warmstone-700 leading-relaxed">Your data lives on secure servers in London. It never leaves the country. Everything is encrypted in transit and at rest. Same standards used by banks.</p>
            </div>

            <div className="bg-warmstone-white border border-warmstone-200 rounded-xl p-4">
              <p className="text-sm font-bold text-warmstone-900 mb-1">AI that forgets</p>
              <p className="text-sm text-warmstone-700 leading-relaxed">When you scan a document, check a medication interaction, or generate a letter, the AI processes your request and sends the result back. It does not store your information, learn from it, or use it for anything else. Every request starts fresh.</p>
            </div>

            <div className="bg-warmstone-white border border-warmstone-200 rounded-xl p-4">
              <p className="text-sm font-bold text-warmstone-900 mb-1">Only you can see it</p>
              <p className="text-sm text-warmstone-700 leading-relaxed">Your records are protected by row-level security. The database itself makes sure you can only access your own data. If you share a care record with family members, they can see that record. Nobody else can. Not us, not advertisers, not third parties.</p>
            </div>

            <div className="bg-warmstone-white border border-warmstone-200 rounded-xl p-4">
              <p className="text-sm font-bold text-warmstone-900 mb-1">No data sales. Ever.</p>
              <p className="text-sm text-warmstone-700 leading-relaxed">CareBee is funded by subscriptions. We do not sell your data, share it with advertisers, or use it for marketing. We never will.</p>
            </div>

            <div className="bg-warmstone-white border border-warmstone-200 rounded-xl p-4">
              <p className="text-sm font-bold text-warmstone-900 mb-1">You are in control</p>
              <p className="text-sm text-warmstone-700 leading-relaxed">You can delete your care record yourself from Settings in the app. This permanently wipes everything: records, medications, documents, calendar entries, and letters. No need to email us. If you want a copy of everything we hold about you, email <a href="mailto:support@mycarebee.co.uk" className="text-honey-600 underline underline-offset-2 hover:text-honey-800">support@mycarebee.co.uk</a> and we will compile it for you.</p>
            </div>

            <div className="bg-warmstone-white border border-warmstone-200 rounded-xl p-4">
              <p className="text-sm font-bold text-warmstone-900 mb-1">Registered and regulated</p>
              <p className="text-sm text-warmstone-700 leading-relaxed">CareBee is in the process of registering with the ICO as a data controller while the app is in beta. We comply with UK GDPR and the Data Protection Act 2018. Health data is special category data and we apply the additional safeguards that requires, including explicit consent.</p>
            </div>
          </div>

          {/* Quick-reference table */}
          <div className="mt-4 bg-warmstone-white border border-warmstone-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {[
                  ["Where is my data stored?", "London, UK"],
                  ["Is it encrypted?", "Yes, in transit and at rest"],
                  ["Does the AI keep my data?", "No. It processes and forgets."],
                  ["Can anyone else see my records?", "Only people you invite to your care record"],
                  ["Do you sell my data?", "Never"],
                  ["Can I delete everything?", "Yes, from Settings in the app. Wipes everything."],
                  ["Are you registered with the ICO?", "Registration in progress (beta)"],
                ].map(([q, a], i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-warmstone-50" : "bg-warmstone-white"}>
                    <td className="px-4 py-3 text-warmstone-700 font-medium w-1/2">{q}</td>
                    <td className="px-4 py-3 text-warmstone-900 font-semibold">{a}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-warmstone-400 mt-2">The full legal detail is in the sections below.</p>
        </div>

        {/* Table of contents */}
        <div className="bg-warmstone-white border border-warmstone-200 rounded-lg p-6 mb-10">
          <p className="text-sm font-bold text-warmstone-500 uppercase tracking-wide mb-3">
            Contents
          </p>
          <ol className="list-decimal list-inside flex flex-col gap-1.5">
            <li>
              <a href="#section-1" className="text-sm text-honey-600 hover:text-honey-800 underline underline-offset-2">
                Who we are
              </a>
            </li>
            <li>
              <a href="#section-2" className="text-sm text-honey-600 hover:text-honey-800 underline underline-offset-2">
                What data we collect
              </a>
            </li>
            <li>
              <a href="#section-3" className="text-sm text-honey-600 hover:text-honey-800 underline underline-offset-2">
                Lawful basis for processing
              </a>
            </li>
            <li>
              <a href="#section-4" className="text-sm text-honey-600 hover:text-honey-800 underline underline-offset-2">
                How we use your data
              </a>
            </li>
            <li>
              <a href="#section-5" className="text-sm text-honey-600 hover:text-honey-800 underline underline-offset-2">
                Who we share your data with
              </a>
            </li>
            <li>
              <a href="#section-6" className="text-sm text-honey-600 hover:text-honey-800 underline underline-offset-2">
                Data storage and security
              </a>
            </li>
            <li>
              <a href="#section-7" className="text-sm text-honey-600 hover:text-honey-800 underline underline-offset-2">
                How long we keep your data
              </a>
            </li>
            <li>
              <a href="#section-8" className="text-sm text-honey-600 hover:text-honey-800 underline underline-offset-2">
                Your rights under UK GDPR
              </a>
            </li>
            <li>
              <a href="#section-9" className="text-sm text-honey-600 hover:text-honey-800 underline underline-offset-2">
                Children
              </a>
            </li>
            <li>
              <a href="#section-10" className="text-sm text-honey-600 hover:text-honey-800 underline underline-offset-2">
                Cookies
              </a>
            </li>
            <li>
              <a href="#section-11" className="text-sm text-honey-600 hover:text-honey-800 underline underline-offset-2">
                Emergency QR codes
              </a>
            </li>
            <li>
              <a href="#section-12" className="text-sm text-honey-600 hover:text-honey-800 underline underline-offset-2">
                AI processing
              </a>
            </li>
            <li>
              <a href="#section-13" className="text-sm text-honey-600 hover:text-honey-800 underline underline-offset-2">
                Changes to this policy
              </a>
            </li>
            <li>
              <a href="#section-14" className="text-sm text-honey-600 hover:text-honey-800 underline underline-offset-2">
                Contact us
              </a>
            </li>
          </ol>
        </div>

        {/* Section 1 */}
        <h2 id="section-1" className="text-xl font-bold text-warmstone-900 mt-12 mb-4 scroll-mt-6">
          1. Who we are
        </h2>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          CareBee is operated by Refittr Ltd (registered address to be confirmed). We are in the process of registering with the Information Commissioner&apos;s Office (ICO) as a data controller while the app is in beta.
        </p>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          Contact for data queries:{" "}
          <a href="mailto:privacy@mycarebee.co.uk" className="text-honey-600 underline underline-offset-2 hover:text-honey-800">
            privacy@mycarebee.co.uk
          </a>
          . We do not have a formal Data Protection Officer at this stage, but all data queries are
          handled by the founding team.
        </p>

        {/* Section 2 */}
        <h2 id="section-2" className="text-xl font-bold text-warmstone-900 mt-12 mb-4 scroll-mt-6">
          2. What data we collect
        </h2>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          We collect only what we need to provide the service. Here is a complete list.
        </p>

        <h3 className="text-base font-bold text-warmstone-900 mt-6 mb-2">
          2.1 Account data
        </h3>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          Your name, email address, and password (stored as a one-way hash: we never see your actual
          password). Profile photo is optional.
        </p>

        <h3 className="text-base font-bold text-warmstone-900 mt-6 mb-2">
          2.2 Health and care records
        </h3>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          The conditions, medications, allergies, appointments, test results, referral details, care
          plan notes, and DNACPR status that you choose to record. This is special category data
          (health data) under UK GDPR. We process it solely to provide the service back to you.
        </p>

        <h3 className="text-base font-bold text-warmstone-900 mt-6 mb-2">
          2.3 Personal details of the people you care for
        </h3>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          Names, dates of birth, NHS numbers, GP and hospital details, next of kin information, and
          power of attorney status for the people whose records you manage.
        </p>

        <h3 className="text-base font-bold text-warmstone-900 mt-6 mb-2">
          2.4 Documents you upload
        </h3>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          Photographs and scans of letters, prescriptions, discharge summaries, benefit
          correspondence, and any other documents you choose to store.
        </p>

        <h3 className="text-base font-bold text-warmstone-900 mt-6 mb-2">
          2.5 Household and sharing data
        </h3>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          Which households you belong to, your role in each household (owner, editor, viewer, or
          emergency only), and invitation records.
        </p>

        <h3 className="text-base font-bold text-warmstone-900 mt-6 mb-2">
          2.6 Emergency share data
        </h3>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          When you generate an emergency QR code, a subset of health information (conditions,
          medications, allergies, DNACPR status, next of kin) is made accessible via a unique link.
          This is explained further in section 11.
        </p>

        <h3 className="text-base font-bold text-warmstone-900 mt-6 mb-2">
          2.7 Usage data
        </h3>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          Pages visited, features used, device type, and browser type. We do not use third-party
          analytics trackers. We do not sell or share usage data with advertisers.
        </p>

        <h3 className="text-base font-bold text-warmstone-900 mt-6 mb-2">
          2.8 Payment data
        </h3>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          If you subscribe to CareBee Plus, payment is processed by Stripe. We never see or store
          your full card details.
        </p>

        {/* Section 3 */}
        <h2 id="section-3" className="text-xl font-bold text-warmstone-900 mt-12 mb-4 scroll-mt-6">
          3. Lawful basis for processing
        </h2>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          Under UK GDPR, we rely on the following lawful bases:
        </p>
        <ul className="list-disc list-outside ml-5 flex flex-col gap-2 mb-4 text-sm text-warmstone-800 leading-relaxed">
          <li>
            <span className="font-semibold text-warmstone-900">Account data and usage data:</span>{" "}
            legitimate interests (running and improving the service).
          </li>
          <li>
            <span className="font-semibold text-warmstone-900">
              Health and care records (special category data):
            </span>{" "}
            explicit consent. You actively choose to enter this data. We process it solely to
            provide the service to you and the family members/carers you authorise. You can withdraw
            consent and delete your data at any time.
          </li>
          <li>
            <span className="font-semibold text-warmstone-900">Contract performance:</span>{" "}
            processing your payment and managing your subscription.
          </li>
        </ul>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          The Article 9 condition for processing special category (health) data is explicit consent.
        </p>

        {/* Section 4 */}
        <h2 id="section-4" className="text-xl font-bold text-warmstone-900 mt-12 mb-4 scroll-mt-6">
          4. How we use your data
        </h2>

        <h3 className="text-base font-bold text-warmstone-900 mt-6 mb-2">
          4.1 To provide the service
        </h3>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          Storing and displaying your records, sharing them with household members you invite,
          generating emergency summaries.
        </p>

        <h3 className="text-base font-bold text-warmstone-900 mt-6 mb-2">
          4.2 To power AI features
        </h3>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          When you use document scanning, entitlements checking, or drug interaction checking, the
          relevant data is sent to our AI provider for processing. It is used solely to return
          results to you. We do not use your health data to train AI models. See section 12 for
          full details.
        </p>

        <h3 className="text-base font-bold text-warmstone-900 mt-6 mb-2">
          4.3 Service communications
        </h3>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          Account verification, password resets, trial expiry notices, and weekly digests (if you
          enable them).
        </p>

        <h3 className="text-base font-bold text-warmstone-900 mt-6 mb-2">
          4.4 Service improvement
        </h3>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          We analyse aggregated, anonymised usage patterns to understand how people use CareBee and
          to make it better. We never use identifiable health data for this purpose.
        </p>

        {/* Section 5 */}
        <h2 id="section-5" className="text-xl font-bold text-warmstone-900 mt-12 mb-4 scroll-mt-6">
          5. Who we share your data with
        </h2>
        <ul className="list-disc list-outside ml-5 flex flex-col gap-2 mb-4 text-sm text-warmstone-800 leading-relaxed">
          <li>
            <span className="font-semibold text-warmstone-900">Household members you invite,</span>{" "}
            at the access level you set.
          </li>
          <li>
            <span className="font-semibold text-warmstone-900">
              Anyone who scans an emergency QR code you generate
            </span>{" "}
            (they see only the emergency summary, not your full record). See section 11.
          </li>
          <li>
            <span className="font-semibold text-warmstone-900">Supabase:</span> our database and
            infrastructure provider. Supabase processes your data on our behalf under a data
            processing agreement. Supabase is SOC 2 Type II compliant and hosts data in the EU
            (London region).
          </li>
          <li>
            <span className="font-semibold text-warmstone-900">Anthropic:</span> when you use AI
            features, the relevant document or data is sent to Anthropic&apos;s API for processing.
            Anthropic does not retain your data for model training purposes. See Anthropic&apos;s
            data processing terms for details.
          </li>
          <li>
            <span className="font-semibold text-warmstone-900">Stripe:</span> if you subscribe to
            CareBee Plus, Stripe processes your payment. We never see your full card number.
          </li>
        </ul>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          We do not sell your data. We do not share your data with advertisers. We do not share
          identifiable health data with any third party for their own purposes.
        </p>

        {/* Section 6 */}
        <h2 id="section-6" className="text-xl font-bold text-warmstone-900 mt-12 mb-4 scroll-mt-6">
          6. Data storage and security
        </h2>
        <ul className="list-disc list-outside ml-5 flex flex-col gap-2 mb-4 text-sm text-warmstone-800 leading-relaxed">
          <li>
            All data is stored on Supabase infrastructure, EU hosted (London region).
          </li>
          <li>
            Data is encrypted in transit (TLS 1.3) and at rest using AES-256.
          </li>
          <li>
            Access to records is controlled by row-level security: you only see households you have
            been invited to.
          </li>
          <li>
            We use role-based access control: owner, editor, viewer, and emergency-only levels.
          </li>
          <li>
            Supabase is SOC 2 Type II certified.
          </li>
          <li>
            We conduct regular security reviews.
          </li>
        </ul>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          If we become aware of a data breach that affects your rights and freedoms, we will notify
          you and the ICO in accordance with UK GDPR requirements.
        </p>

        {/* Section 7 */}
        <h2 id="section-7" className="text-xl font-bold text-warmstone-900 mt-12 mb-4 scroll-mt-6">
          7. How long we keep your data
        </h2>
        <ul className="list-disc list-outside ml-5 flex flex-col gap-2 mb-4 text-sm text-warmstone-800 leading-relaxed">
          <li>
            <span className="font-semibold text-warmstone-900">Account and records:</span> kept for
            as long as your account is active.
          </li>
          <li>
            <span className="font-semibold text-warmstone-900">Account deletion:</span> all personal
            data and records are permanently deleted within 30 days of account deletion.
          </li>
          <li>
            <span className="font-semibold text-warmstone-900">Person record deletion:</span> data
            is permanently deleted within 30 days.
          </li>
          <li>
            <span className="font-semibold text-warmstone-900">Documents:</span> deleted when you
            delete them, or when your account is deleted.
          </li>
          <li>
            <span className="font-semibold text-warmstone-900">Emergency share links:</span>{" "}
            deactivated links are purged within 30 days.
          </li>
          <li>
            <span className="font-semibold text-warmstone-900">
              Anonymised, aggregated usage data:
            </span>{" "}
            may be retained indefinitely for service improvement.
          </li>
        </ul>

        {/* Section 8 */}
        <h2 id="section-8" className="text-xl font-bold text-warmstone-900 mt-12 mb-4 scroll-mt-6">
          8. Your rights under UK GDPR
        </h2>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          You have the following rights regarding your personal data. To exercise any of these,
          email{" "}
          <a href="mailto:privacy@mycarebee.co.uk" className="text-honey-600 underline underline-offset-2 hover:text-honey-800">
            privacy@mycarebee.co.uk
          </a>{" "}
          or use the data management tools within the app.
        </p>
        <ul className="list-disc list-outside ml-5 flex flex-col gap-2 mb-4 text-sm text-warmstone-800 leading-relaxed">
          <li>
            <span className="font-semibold text-warmstone-900">Right of access:</span> you can request a copy of all the data we hold about you by emailing <a href="mailto:support@mycarebee.co.uk" className="text-honey-600 underline underline-offset-2 hover:text-honey-800">support@mycarebee.co.uk</a>. We will compile it manually and respond within one month.
          </li>
          <li>
            <span className="font-semibold text-warmstone-900">Right to rectification:</span> if
            any data we hold about you is inaccurate, you can ask us to correct it.
          </li>
          <li>
            <span className="font-semibold text-warmstone-900">Right to erasure:</span> you can delete your care record yourself from Settings in the app. This permanently removes everything: records, medications, documents, calendar entries, and letters. No need to contact us.
          </li>
          <li>
            <span className="font-semibold text-warmstone-900">Right to restrict processing:</span>{" "}
            you can ask us to limit how we process your data in certain circumstances.
          </li>

          <li>
            <span className="font-semibold text-warmstone-900">Right to object:</span> you can
            object to our processing of your data on grounds of legitimate interests.
          </li>
          <li>
            <span className="font-semibold text-warmstone-900">Right to withdraw consent:</span>{" "}
            you can withdraw your consent for us to process your health data at any time by deleting
            your records or your account.
          </li>
          <li>
            <span className="font-semibold text-warmstone-900">Right to complain:</span> if you are
            unhappy with how we handle your data, you can complain to the Information
            Commissioner&apos;s Office (ICO) at{" "}
            <a
              href="https://ico.org.uk"
              target="_blank"
              rel="noopener noreferrer"
              className="text-honey-600 underline underline-offset-2 hover:text-honey-800"
            >
              ico.org.uk
            </a>{" "}
            or by calling 0303 123 1113.
          </li>
        </ul>

        {/* Section 9 */}
        <h2 id="section-9" className="text-xl font-bold text-warmstone-900 mt-12 mb-4 scroll-mt-6">
          9. Children
        </h2>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          CareBee may be used to store health records for children as part of family and carer
          management. This data is entered and managed by a parent or legal guardian, who provides
          consent for its storage and use.
        </p>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          We do not knowingly allow children under the age of 13 to create their own CareBee
          accounts. If you believe we have collected data from a child under 13 without appropriate
          consent, please contact{" "}
          <a href="mailto:privacy@mycarebee.co.uk" className="text-honey-600 underline underline-offset-2 hover:text-honey-800">
            privacy@mycarebee.co.uk
          </a>
          .
        </p>

        {/* Section 10 */}
        <h2 id="section-10" className="text-xl font-bold text-warmstone-900 mt-12 mb-4 scroll-mt-6">
          10. Cookies
        </h2>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          We use only essential session cookies required for you to stay logged in to CareBee. We do
          not use advertising cookies, tracking cookies, or third-party analytics cookies. You
          cannot opt out of essential session cookies without losing the ability to use the service.
        </p>

        {/* Section 11 */}
        <h2 id="section-11" className="text-xl font-bold text-warmstone-900 mt-12 mb-4 scroll-mt-6">
          11. Emergency QR codes
        </h2>
        <div className="bg-honey-50 border border-honey-200 rounded-lg p-4 mb-4 text-sm text-warmstone-800 leading-relaxed">
          When you generate an emergency QR code, anyone with the link can view a summary of
          critical health information without logging in. Only generate a QR code if you have the
          authority to share that information.
        </div>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          When you generate an emergency QR code for someone, a read-only summary of critical health
          information (conditions, medications, allergies, DNACPR status, and next of kin details)
          is accessible via a unique URL. Anyone who has this URL can view this summary without
          logging in to CareBee.
        </p>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          You can deactivate an emergency QR code at any time from within the app. Deactivated links
          stop working immediately. The summary data associated with deactivated links is purged
          within 30 days.
        </p>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          By generating an emergency QR code, you confirm that you have the authority to share the
          health information it contains.
        </p>

        {/* Section 12 */}
        <h2 id="section-12" className="text-xl font-bold text-warmstone-900 mt-12 mb-4 scroll-mt-6">
          12. AI processing
        </h2>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          CareBee uses AI to power several features: document scanning, medication interaction checks, health insights, appointment prep briefs, and letter generation.
        </p>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          Here is how that works:
        </p>
        <ol className="list-decimal list-outside ml-5 flex flex-col gap-2 mb-4 text-sm text-warmstone-800 leading-relaxed">
          <li>
            When you use an AI feature, the relevant information (for example, the photo of a letter you scanned, or the medication names you want to check) is sent securely to the AI for processing.
          </li>
          <li>
            The AI processes your request and sends the result back to CareBee.
          </li>
          <li>
            <span className="font-semibold text-warmstone-900">The AI does not keep your data.</span> It does not store it, learn from it, or use it to train itself. Each request is processed independently and then forgotten.
          </li>
          <li>
            The result (the scanned text, the interaction warning, the generated letter) is saved in your CareBee account so you can access it again.
          </li>
        </ol>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          We process only the minimum data necessary for each feature. We will update this section if we add new AI features or change AI providers.
        </p>

        {/* Section 13 */}
        <h2 id="section-13" className="text-xl font-bold text-warmstone-900 mt-12 mb-4 scroll-mt-6">
          13. Changes to this policy
        </h2>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          If we update this privacy policy in a way that materially changes how we handle your
          health data, we will notify you by email and within the app at least 14 days before the
          changes take effect. Continued use of CareBee after that date constitutes acceptance of
          the updated policy.
        </p>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          Minor or clarifying changes may be made without notice. The &quot;Last updated&quot; date
          at the top of this page always reflects the most recent version.
        </p>

        {/* Section 14 */}
        <h2 id="section-14" className="text-xl font-bold text-warmstone-900 mt-12 mb-4 scroll-mt-6">
          14. Contact us
        </h2>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          For questions about this privacy policy, to exercise your data rights, or to report a
          concern, contact:{" "}
          <a href="mailto:privacy@mycarebee.co.uk" className="text-honey-600 underline underline-offset-2 hover:text-honey-800">
            privacy@mycarebee.co.uk
          </a>
        </p>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          We aim to respond to all data queries within 5 working days.
        </p>

        {/* Common questions */}
        <div className="mt-16 bg-warmstone-white border border-warmstone-200 rounded-xl p-6 flex flex-col gap-5">
          <p className="text-sm font-bold text-warmstone-500 uppercase tracking-wide">Common questions</p>

          <div>
            <p className="text-sm font-bold text-warmstone-900 mb-1">Do you sell my data?</p>
            <p className="text-sm text-warmstone-700 leading-relaxed">No. Never. CareBee makes money through subscriptions, not data sales.</p>
          </div>

          <div>
            <p className="text-sm font-bold text-warmstone-900 mb-1">Can my GP or employer see my CareBee records?</p>
            <p className="text-sm text-warmstone-700 leading-relaxed">No. Your CareBee account is completely separate from NHS systems. Nobody can access it unless you choose to share information with them, for example by showing them a letter you generated.</p>
          </div>

          <div>
            <p className="text-sm font-bold text-warmstone-900 mb-1">What happens if CareBee closes down?</p>
            <p className="text-sm text-warmstone-700 leading-relaxed">We would give you at least 30 days notice and provide tools to export all your data before anything was deleted.</p>
          </div>

          <div>
            <p className="text-sm font-bold text-warmstone-900 mb-1">Is CareBee registered with the ICO?</p>
            <p className="text-sm text-warmstone-700 leading-relaxed">CareBee is in the process of registering with the Information Commissioner&apos;s Office as a data controller. The app is currently in beta and registration will be completed before full public launch.</p>
          </div>

          <div>
            <p className="text-sm font-bold text-warmstone-900 mb-1">What if there is a data breach?</p>
            <p className="text-sm text-warmstone-700 leading-relaxed">We have a breach notification procedure in place. If your data were ever compromised, we would notify you and the ICO within 72 hours, as required by law. We would also explain exactly what happened and what steps we are taking.</p>
          </div>

          <div className="pt-2 border-t border-warmstone-100">
            <p className="text-sm text-warmstone-700 leading-relaxed">Still have questions? Email us at <a href="mailto:support@mycarebee.co.uk" className="text-honey-600 underline underline-offset-2 hover:text-honey-800">support@mycarebee.co.uk</a>. We are happy to explain anything in more detail. Your trust matters more to us than anything else.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-warmstone-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-warmstone-400">
          <span>Refittr Ltd operating as CareBee. Registered in England and Wales.</span>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-warmstone-600 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-warmstone-600 transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
