import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | CareBee",
  description: "Terms of service for CareBee, the family care record app.",
};

export default function TermsPage() {
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
          Terms of Service
        </h1>
        <p className="text-sm text-warmstone-500 mb-8 border-b border-warmstone-200 pb-8">
          Last updated: 23 March 2026
        </p>

        {/* Table of contents */}
        <div className="bg-warmstone-white border border-warmstone-200 rounded-lg p-6 mb-10">
          <p className="text-sm font-bold text-warmstone-500 uppercase tracking-wide mb-3">
            Contents
          </p>
          <ol className="list-decimal list-inside flex flex-col gap-1.5">
            <li>
              <a href="#section-1" className="text-sm text-honey-600 hover:text-honey-800 underline underline-offset-2">
                About CareBee
              </a>
            </li>
            <li>
              <a href="#section-2" className="text-sm text-honey-600 hover:text-honey-800 underline underline-offset-2">
                Not medical advice
              </a>
            </li>
            <li>
              <a href="#section-3" className="text-sm text-honey-600 hover:text-honey-800 underline underline-offset-2">
                Accuracy of information
              </a>
            </li>
            <li>
              <a href="#section-4" className="text-sm text-honey-600 hover:text-honey-800 underline underline-offset-2">
                Eligibility
              </a>
            </li>
            <li>
              <a href="#section-5" className="text-sm text-honey-600 hover:text-honey-800 underline underline-offset-2">
                Your account
              </a>
            </li>
            <li>
              <a href="#section-6" className="text-sm text-honey-600 hover:text-honey-800 underline underline-offset-2">
                Household access and sharing
              </a>
            </li>
            <li>
              <a href="#section-7" className="text-sm text-honey-600 hover:text-honey-800 underline underline-offset-2">
                Emergency QR codes
              </a>
            </li>
            <li>
              <a href="#section-8" className="text-sm text-honey-600 hover:text-honey-800 underline underline-offset-2">
                AI features
              </a>
            </li>
            <li>
              <a href="#section-9" className="text-sm text-honey-600 hover:text-honey-800 underline underline-offset-2">
                Pricing and plans
              </a>
            </li>
            <li>
              <a href="#section-10" className="text-sm text-honey-600 hover:text-honey-800 underline underline-offset-2">
                Subscription and billing
              </a>
            </li>
            <li>
              <a href="#section-11" className="text-sm text-honey-600 hover:text-honey-800 underline underline-offset-2">
                Your data
              </a>
            </li>
            <li>
              <a href="#section-12" className="text-sm text-honey-600 hover:text-honey-800 underline underline-offset-2">
                Acceptable use
              </a>
            </li>
            <li>
              <a href="#section-13" className="text-sm text-honey-600 hover:text-honey-800 underline underline-offset-2">
                Service availability
              </a>
            </li>
            <li>
              <a href="#section-14" className="text-sm text-honey-600 hover:text-honey-800 underline underline-offset-2">
                Limitation of liability
              </a>
            </li>
            <li>
              <a href="#section-15" className="text-sm text-honey-600 hover:text-honey-800 underline underline-offset-2">
                Termination
              </a>
            </li>
            <li>
              <a href="#section-16" className="text-sm text-honey-600 hover:text-honey-800 underline underline-offset-2">
                Changes to these terms
              </a>
            </li>
            <li>
              <a href="#section-17" className="text-sm text-honey-600 hover:text-honey-800 underline underline-offset-2">
                Governing law
              </a>
            </li>
            <li>
              <a href="#section-18" className="text-sm text-honey-600 hover:text-honey-800 underline underline-offset-2">
                Contact us
              </a>
            </li>
          </ol>
        </div>

        {/* Section 1 */}
        <h2 id="section-1" className="text-xl font-bold text-warmstone-900 mt-12 mb-4 scroll-mt-6">
          1. About CareBee
        </h2>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          CareBee is a personal and family health and care record service operated by CareBee Ltd.
          It allows users to store, organise, and share health and care information for themselves
          and the people they care for. By creating an account and using CareBee, you agree to
          these terms.
        </p>

        {/* Section 2 */}
        <h2 id="section-2" className="text-xl font-bold text-warmstone-900 mt-12 mb-4 scroll-mt-6">
          2. Not medical advice
        </h2>
        <div className="bg-honey-50 border border-honey-200 rounded-lg p-4 mb-4 text-sm text-warmstone-800 leading-relaxed">
          CareBee does not provide medical advice, diagnosis, or treatment. If you think you or
          someone you care for is having a medical emergency, call 999 immediately. Do not rely on
          CareBee in an emergency.
        </div>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          Nothing in the CareBee service should be interpreted as medical advice.
        </p>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          AI features surface information and flag potential issues for you to discuss with your
          healthcare professionals. They are informational tools, not clinical decision support
          systems.
        </p>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          Always consult a qualified healthcare professional before making decisions about
          medication, treatment, or care.
        </p>

        {/* Section 3 */}
        <h2 id="section-3" className="text-xl font-bold text-warmstone-900 mt-12 mb-4 scroll-mt-6">
          3. Accuracy of information
        </h2>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          You are responsible for the accuracy of the information you enter into CareBee. CareBee
          does not verify the accuracy of health records, medication details, or any other data you
          enter.
        </p>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          When AI features extract information from documents, the extracted data is always
          presented for your review and confirmation before being saved. You are responsible for
          checking that AI-extracted information is accurate.
        </p>

        {/* Section 4 */}
        <h2 id="section-4" className="text-xl font-bold text-warmstone-900 mt-12 mb-4 scroll-mt-6">
          4. Eligibility
        </h2>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          You must be 18 or older to create a CareBee account. Parents and legal guardians may
          create and manage records for children as part of household management.
        </p>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          By creating an account, you confirm that you are at least 18 years old.
        </p>

        {/* Section 5 */}
        <h2 id="section-5" className="text-xl font-bold text-warmstone-900 mt-12 mb-4 scroll-mt-6">
          5. Your account
        </h2>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          You are responsible for keeping your login credentials secure and for all activity that
          occurs under your account.
        </p>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          If you believe your account has been compromised, contact us at{" "}
          <a href="mailto:hello@carebee.co.uk" className="text-honey-600 underline underline-offset-2 hover:text-honey-800">
            hello@carebee.co.uk
          </a>{" "}
          immediately and change your password.
        </p>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          Do not share your login credentials with other people. If you want to give someone else
          access to a household, use the invitation system.
        </p>

        {/* Section 6 */}
        <h2 id="section-6" className="text-xl font-bold text-warmstone-900 mt-12 mb-4 scroll-mt-6">
          6. Household access and sharing
        </h2>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          When you invite someone to a household, they can access the records in that household at
          the level you assign (owner, editor, viewer, or emergency only).
        </p>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          You are responsible for managing who has access to your households. As a household owner,
          you can change access levels or remove members at any time.
        </p>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          Be thoughtful about who you invite. Health data is sensitive. Once someone has viewed
          information in CareBee, we cannot make them forget it.
        </p>

        {/* Section 7 */}
        <h2 id="section-7" className="text-xl font-bold text-warmstone-900 mt-12 mb-4 scroll-mt-6">
          7. Emergency QR codes
        </h2>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          By generating an emergency QR code, you consent to making a summary of critical health
          information accessible to anyone who has the link, without requiring them to log in.
        </p>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          You confirm that you have the authority to share the health information included in the
          summary. This applies either because it is your own information, or because you are the
          legal carer or representative of the person whose information it is.
        </p>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          You can deactivate an emergency QR code at any time. The link stops working immediately
          on deactivation.
        </p>

        {/* Section 8 */}
        <h2 id="section-8" className="text-xl font-bold text-warmstone-900 mt-12 mb-4 scroll-mt-6">
          8. AI features
        </h2>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          AI-powered features including document scanning, benefits and entitlements suggestions,
          drug interaction flags, and appointment preparation briefs are provided as informational
          tools only. They may contain errors or omissions.
        </p>

        <h3 className="text-base font-bold text-warmstone-900 mt-6 mb-2">
          Specific disclaimers
        </h3>
        <ul className="list-disc list-outside ml-5 flex flex-col gap-2 mb-4 text-sm text-warmstone-800 leading-relaxed">
          <li>
            <span className="font-semibold text-warmstone-900">Document scanning:</span> AI
            extraction may be incomplete or inaccurate. Always review and confirm extracted data
            before saving.
          </li>
          <li>
            <span className="font-semibold text-warmstone-900">
              Benefits and entitlements:
            </span>{" "}
            suggestions are based on publicly available eligibility criteria and may not reflect
            your specific circumstances. Always verify benefit eligibility with the relevant
            authority (DWP, local council, or a benefits adviser).
          </li>
          <li>
            <span className="font-semibold text-warmstone-900">Drug interaction flags:</span> these
            are based on known interaction databases and are not a substitute for review by a
            pharmacist or GP. CareBee does not have access to your full medication history unless
            you have entered it.
          </li>
          <li>
            <span className="font-semibold text-warmstone-900">
              Appointment briefs and waiting list estimates:
            </span>{" "}
            these are informational summaries only and do not constitute official NHS information.
          </li>
        </ul>

        {/* Section 9 */}
        <h2 id="section-9" className="text-xl font-bold text-warmstone-900 mt-12 mb-4 scroll-mt-6">
          9. Pricing and plans
        </h2>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          CareBee offers a free tier and CareBee Plus (a paid subscription).
        </p>

        <h3 className="text-base font-bold text-warmstone-900 mt-6 mb-2">
          Free tier includes
        </h3>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          A record for one person, conditions, medications, allergies, appointments, documents, and
          up to 2 household members.
        </p>

        <h3 className="text-base font-bold text-warmstone-900 mt-6 mb-2">
          CareBee Plus includes
        </h3>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          All free features plus: AI document scanning, benefits and entitlements engine, drug
          interaction checking, unlimited people, unlimited household members, emergency QR codes,
          appointment preparation briefs, waiting list estimates, communications log, and weekly
          digest.
        </p>

        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          New accounts receive a 30 day trial of CareBee Plus at no cost, with no credit card
          required. After the trial, accounts move to the free tier unless the user subscribes to
          CareBee Plus. Users keep all their data regardless of plan.
        </p>

        {/* Section 10 */}
        <h2 id="section-10" className="text-xl font-bold text-warmstone-900 mt-12 mb-4 scroll-mt-6">
          10. Subscription and billing
        </h2>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          CareBee Plus is available as a monthly subscription (£4.99/month) or an annual
          subscription (£44.99/year). Prices are as displayed at the time of purchase.
        </p>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          We will give at least 30 days notice of any price increases. You can cancel your
          subscription at any time.
        </p>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          If you cancel, you retain access to CareBee Plus until the end of your current billing
          period. After that, your account moves to the free tier.
        </p>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          Refunds are handled in accordance with your rights under the Consumer Contracts
          Regulations 2013 and other applicable UK consumer protection legislation. If you have a
          question about a charge, contact{" "}
          <a href="mailto:hello@carebee.co.uk" className="text-honey-600 underline underline-offset-2 hover:text-honey-800">
            hello@carebee.co.uk
          </a>
          .
        </p>

        {/* Section 11 */}
        <h2 id="section-11" className="text-xl font-bold text-warmstone-900 mt-12 mb-4 scroll-mt-6">
          11. Your data
        </h2>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          Your data belongs to you. CareBee Ltd does not claim ownership of any content you create
          or upload.
        </p>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          You grant CareBee Ltd a limited licence to store, process, and display your data solely
          for the purpose of providing the service to you and the household members you authorise.
        </p>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          You can export or delete your data at any time. See our{" "}
          <Link href="/privacy" className="text-honey-600 underline underline-offset-2 hover:text-honey-800">
            Privacy Policy
          </Link>{" "}
          for details.
        </p>

        {/* Section 12 */}
        <h2 id="section-12" className="text-xl font-bold text-warmstone-900 mt-12 mb-4 scroll-mt-6">
          12. Acceptable use
        </h2>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          You agree not to:
        </p>
        <ul className="list-disc list-outside ml-5 flex flex-col gap-2 mb-4 text-sm text-warmstone-800 leading-relaxed">
          <li>
            Store data about people without their knowledge or consent, except where you have legal
            authority to manage their affairs (for example, under a lasting power of attorney, or
            as a parent or guardian managing a child&apos;s record).
          </li>
          <li>
            Use CareBee for any unlawful purpose.
          </li>
          <li>
            Attempt to gain unauthorised access to other users&apos; accounts or records.
          </li>
          <li>
            Use CareBee to distribute harmful, misleading, or abusive content.
          </li>
          <li>
            Attempt to reverse engineer, scrape, or interfere with the CareBee service.
          </li>
        </ul>

        {/* Section 13 */}
        <h2 id="section-13" className="text-xl font-bold text-warmstone-900 mt-12 mb-4 scroll-mt-6">
          13. Service availability
        </h2>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          We aim to keep CareBee available at all times but cannot guarantee uninterrupted access.
          We may need to take the service offline for maintenance or security reasons. Where
          possible, we will give advance notice.
        </p>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          We are not responsible for losses arising from service unavailability, except where caused
          by our negligence.
        </p>

        {/* Section 14 */}
        <h2 id="section-14" className="text-xl font-bold text-warmstone-900 mt-12 mb-4 scroll-mt-6">
          14. Limitation of liability
        </h2>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          CareBee is provided &quot;as is&quot; without warranties of any kind, to the extent
          permitted by law.
        </p>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          To the maximum extent permitted by applicable law, CareBee Ltd is not liable for:
        </p>
        <ul className="list-disc list-outside ml-5 flex flex-col gap-2 mb-4 text-sm text-warmstone-800 leading-relaxed">
          <li>
            Any indirect, incidental, or consequential losses arising from your use of the service.
          </li>
          <li>
            Losses arising from reliance on AI-generated content, including document extraction,
            benefits suggestions, or drug interaction flags.
          </li>
          <li>
            Losses arising from inaccuracies in health records you or others have entered.
          </li>
          <li>
            Loss of data, except where caused by our negligence.
          </li>
        </ul>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          Nothing in these terms limits our liability for death or personal injury caused by our
          negligence, fraud or fraudulent misrepresentation, or any other liability that cannot be
          excluded under applicable UK law.
        </p>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          If you are a consumer (not using CareBee for business purposes), your statutory rights
          under UK consumer protection legislation are not affected by these terms.
        </p>

        {/* Section 15 */}
        <h2 id="section-15" className="text-xl font-bold text-warmstone-900 mt-12 mb-4 scroll-mt-6">
          15. Termination
        </h2>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          You may delete your account at any time from within the app. On deletion, your data is
          removed in accordance with our{" "}
          <Link href="/privacy" className="text-honey-600 underline underline-offset-2 hover:text-honey-800">
            Privacy Policy
          </Link>
          .
        </p>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          We may suspend or terminate your account if you breach these terms, if we are required to
          do so by law, or if we have reasonable grounds to believe your account poses a risk to
          other users. We will give reasonable notice where possible, except where immediate action
          is required for security reasons.
        </p>

        {/* Section 16 */}
        <h2 id="section-16" className="text-xl font-bold text-warmstone-900 mt-12 mb-4 scroll-mt-6">
          16. Changes to these terms
        </h2>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          We may update these terms from time to time. If we make material changes, we will notify
          you by email and within the app at least 14 days before the changes take effect.
          Continued use of CareBee after that date means you accept the updated terms.
        </p>

        {/* Section 17 */}
        <h2 id="section-17" className="text-xl font-bold text-warmstone-900 mt-12 mb-4 scroll-mt-6">
          17. Governing law
        </h2>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          These terms are governed by the laws of England and Wales. Any disputes arising from
          these terms or your use of CareBee will be subject to the exclusive jurisdiction of the
          courts of England and Wales.
        </p>

        {/* Section 18 */}
        <h2 id="section-18" className="text-xl font-bold text-warmstone-900 mt-12 mb-4 scroll-mt-6">
          18. Contact us
        </h2>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          For questions about these terms, contact:{" "}
          <a href="mailto:hello@carebee.co.uk" className="text-honey-600 underline underline-offset-2 hover:text-honey-800">
            hello@carebee.co.uk
          </a>
        </p>
        <p className="text-warmstone-800 leading-relaxed mb-4 text-sm">
          For data and privacy queries, contact:{" "}
          <a href="mailto:privacy@carebee.co.uk" className="text-honey-600 underline underline-offset-2 hover:text-honey-800">
            privacy@carebee.co.uk
          </a>
        </p>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-warmstone-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-warmstone-400">
          <span>CareBee Ltd. Registered in England and Wales.</span>
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
