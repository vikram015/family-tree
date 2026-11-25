import React from "react";
import { Helmet } from "react-helmet-async";
import { LegalDocument, LegalSection } from "../LegalPage/LegalDocument";

/**
 * Child Safety Standards — required by Google Play for social apps (CSAE
 * policy). Linked from the Play Console "Child safety standards" declaration.
 */
const SECTIONS: LegalSection[] = [
  {
    heading: "1. Zero tolerance",
    paragraphs: [
      "Kinvia strictly prohibits child sexual abuse and exploitation (CSAE) and child sexual abuse material (CSAM) of any kind. This includes any content, message, photo or behaviour that sexualises, grooms, exploits or endangers a child.",
      "Accounts found posting, sharing or soliciting such content are permanently blocked, and the content is removed.",
    ],
  },
  {
    heading: "2. Who can use Kinvia",
    paragraphs: [
      "Kinvia is for adults. You must be 18 or older to create an account. Children may appear in family trees only as records added by adult relatives, and we do not show details of people recorded as under 18 to visitors who are not signed in.",
    ],
  },
  {
    heading: "3. How to report",
    paragraphs: [
      "Signed-in users can report a wish, message or business listing with the Report (flag) button next to it. Anyone — with or without an account — can also email support@kinvia.in. Please include a link or describe where the content appears; do not attach or forward the material itself.",
    ],
  },
  {
    heading: "4. What we do with a report",
    bullets: [
      "Reports about child safety are reviewed with the highest priority.",
      "Content that violates this policy is removed and the account responsible is blocked.",
      "Where we become aware of child sexual abuse material, we report it to the relevant authorities, including India's National Cyber Crime Reporting Portal (cybercrime.gov.in) and law enforcement, as required by law, and preserve information needed for the investigation.",
      "We cooperate with law-enforcement requests made under applicable law.",
    ],
  },
  {
    heading: "5. Legal compliance",
    paragraphs: [
      "Kinvia complies with applicable child-safety laws, including India's Protection of Children from Sexual Offences (POCSO) Act, 2012 and the Information Technology Act, 2000 and its rules.",
    ],
  },
  {
    heading: "6. Child safety contact",
    paragraphs: [
      "Our designated point of contact for child safety matters can be reached at support@kinvia.in (subject: Child safety). They are able to speak to our CSAM prevention practices and compliance.",
    ],
  },
];

export const ChildSafetyPage: React.FC = () => (
  <>
    <Helmet>
      <title>Child Safety Standards - Kinvia</title>
      <meta
        name="description"
        content="Kinvia's standards against child sexual abuse and exploitation, and how to report a concern."
      />
    </Helmet>
    <LegalDocument
      title="Child Safety Standards"
      lastUpdated="25 November 2026"
      intro="Kinvia is a place for families. Keeping children safe is non-negotiable. This page sets out our standards against child sexual abuse and exploitation and how to report a concern."
      sections={SECTIONS}
      siblingLabel="Privacy Policy"
      siblingTo="/privacy-policy"
    />
  </>
);

export default ChildSafetyPage;
