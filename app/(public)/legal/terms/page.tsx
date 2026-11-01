import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/data";
import { PageHero } from "@/components/layout/page-hero";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Terms governing use of this website and the information published on it.",
  alternates: { canonical: "/legal/terms" },
};

const SECTIONS = [
  {
    title: "Website information",
    body: "Property particulars are prepared in good faith from information supplied by owners and, where available, supporting documents. Measurements are approximate and should not be relied upon as a survey. Nothing on this website forms part of an offer or contract. Prospective purchasers and tenants must satisfy themselves as to the accuracy of any statement before entering into an agreement.",
  },
  {
    title: "Availability",
    body: "Listings are updated regularly, but a property shown as available may be under offer or withdrawn without notice. Availability is confirmed in writing by an advisor before any viewing or negotiation.",
  },
  {
    title: "Imagery",
    body: "Photography is representative of the property concerned unless otherwise stated. Where imagery is being prepared, the listing states so. Demonstration records used in preview environments are labelled and are not offered for sale or let.",
  },
  {
    title: "Enquiries",
    body: "By submitting an enquiry you confirm that the details provided are accurate and that you consent to being contacted about that enquiry. Automated or abusive submissions are blocked, and repeated submissions may be rate limited.",
  },
  {
    title: "Intellectual property",
    body: "The design, written content and photography on this website are protected. They may not be reproduced for commercial purposes without written permission.",
  },
  {
    title: "Limitation of liability",
    body: "To the extent permitted by law, the website owner is not liable for indirect or consequential loss arising from use of this website. Nothing in these terms limits liability for fraud or any liability that cannot lawfully be excluded.",
  },
  {
    title: "Governing law",
    body: "These terms are governed by the laws of India, and the courts of Assam have exclusive jurisdiction over any dispute arising from use of this website.",
  },
];

export default async function TermsPage() {
  const settings = await getSiteSettings();

  return (
    <>
      <PageHero
        size="sm"
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Terms of Use" }]}
        eyebrow="Legal"
        title="Terms of Use"
        description="Please read these terms before relying on any information published on this website."
      />
      <section className="shell max-w-prose2 py-14 sm:py-16">
        <div className="space-y-9">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <h2 className="font-display text-2xl text-ivory">{section.title}</h2>
              <p className="mt-3 text-[0.9rem] leading-relaxed text-silver/80">{section.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 border-t border-white/[0.08] pt-6 text-[0.82rem] text-silver/70">
          <p>
            Contact:{" "}
            <a href={`mailto:${settings.contact.email}`} className="text-gold hover:text-gold-soft">
              {settings.contact.email}
            </a>{" "}
            · {settings.contact.phone}
          </p>
        </div>
      </section>
    </>
  );
}
