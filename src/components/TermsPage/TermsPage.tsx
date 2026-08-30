import React from "react";
import { Helmet } from "react-helmet-async";
import { LegalDocument, LegalSection } from "../LegalPage/LegalDocument";

const SECTIONS: LegalSection[] = [
  {
    heading: "1. Accepting these terms",
    paragraphs: [
      "By creating a Kinvia account you agree to these terms. If you do not agree, please do not use the service. You must be 18 or older to hold an account.",
    ],
  },
  {
    heading: "2. Your account",
    paragraphs: [
      "You sign in with your phone number, and you are responsible for what happens under your account. Give us accurate details and keep them up to date. Do not share your access with someone else or create an account in another person's name.",
    ],
  },
  {
    heading: "3. What you add about other people",
    paragraphs: [
      "This is the most important term in this document. A family tree is mostly made up of information about people other than you, and most of them have not agreed to be listed.",
      "By adding someone you confirm that you have a genuine family connection to them, that you are recording information you legitimately know, and that you will correct or remove it if they ask.",
    ],
    bullets: [
      "Do not add contact numbers, identity-document numbers, financial details or medical records about anyone.",
      "Do not add photographs of other people without their agreement, and never of someone who has asked you not to.",
      "Take particular care with living children — record no more than the relationship requires.",
      "Do not add information in order to embarrass, expose or target anyone.",
    ],
  },
  {
    heading: "4. Removal requests",
    paragraphs: [
      "Anyone listed in a tree can ask us to correct or remove their entry, whether or not they hold a Kinvia account. We will act on those requests, and we may remove or amend an entry without the contributor's agreement where we consider it necessary. Where removing a person outright would break the family structure, we may instead reduce their entry to the minimum needed to keep relationships intact.",
    ],
  },
  {
    heading: "5. Trees, access and invitations",
    paragraphs: [
      "The person who creates a tree controls it, and can grant others access to the whole tree or to a branch of it. Granting access is a real decision: it lets that person see and change family records. Grant it only to people you trust.",
      "Access can be withdrawn at any time by the tree owner or by us.",
    ],
  },
  {
    heading: "6. Business listings",
    paragraphs: [
      "You may list a business you own or operate. The listing, including its contact details, is visible to every signed-in user browsing that location — that is its purpose. List only businesses you are entitled to represent, describe them accurately, and keep the details current.",
    ],
  },
  {
    heading: "7. Acceptable use",
    bullets: [
      "Do not impersonate anyone, or claim a profile in the tree that is not yours.",
      "Do not upload unlawful, abusive, obscene or knowingly false content.",
      "Do not scrape, bulk-download or systematically copy data from Kinvia.",
      "Do not attempt to reach trees, accounts or records you have not been given access to.",
      "Do not use Kinvia to discriminate against, exclude or harass any person or community.",
    ],
  },
  {
    heading: "8. Your content",
    paragraphs: [
      "What you add stays yours. You give us the permission we need to store it, display it to the people entitled to see it, and back it up, for as long as it is on Kinvia. You confirm you are entitled to provide anything you upload.",
    ],
  },
  {
    heading: "9. Suspension",
    paragraphs: [
      "We may suspend or close an account that breaches these terms, that puts other people's data at risk, or where we are required to do so by law. Where it is reasonable to do so, we will tell you why.",
    ],
  },
  {
    heading: "10. Service availability",
    paragraphs: [
      "Kinvia is provided as it is. We work to keep it available and accurate, but we do not guarantee uninterrupted service, and we cannot guarantee that information entered by other users is correct. Family-tree entries are contributed by people, not verified records.",
      "Keep your own copy of anything you would be upset to lose.",
    ],
  },
  {
    heading: "11. Liability",
    paragraphs: [
      "To the extent the law allows, Kinvia is not liable for indirect or consequential loss arising from your use of the service, or for content contributed by other users. Nothing here limits liability that cannot be limited by law.",
    ],
  },
  {
    heading: "12. Changes and governing law",
    paragraphs: [
      "We may update these terms, and will tell you in the app before a significant change takes effect. These terms are governed by the laws of India, and the courts of India have jurisdiction over any dispute.",
      "Questions about these terms: support@kinvia.in.",
    ],
  },
];

export const TermsPage: React.FC = () => (
  <>
    <Helmet>
      <title>Terms of Use - Kinvia</title>
      <meta
        name="description"
        content="The rules for using Kinvia, including your responsibilities for the family information you record about other people."
      />
    </Helmet>

    <LegalDocument
      title="Terms of Use"
      lastUpdated="29 August 2026"
      intro="These terms cover your use of Kinvia. The section that matters most is section 3 — what you add about other people — because a family tree is largely made up of information about relatives who have not signed up themselves."
      sections={SECTIONS}
      siblingLabel="Privacy Policy"
      siblingTo="/privacy-policy"
    />
  </>
);

export default TermsPage;
