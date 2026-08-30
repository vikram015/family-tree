import React from "react";
import { Helmet } from "react-helmet-async";
import { LegalDocument, LegalSection } from "../LegalPage/LegalDocument";

const SECTIONS: LegalSection[] = [
  {
    heading: "1. Who we are",
    paragraphs: [
      "Kinvia is a family-tree service operated from India. For the purposes of India's Digital Personal Data Protection Act, 2023, we act as the Data Fiduciary for the personal data described below. You can reach us at support@kinvia.in.",
    ],
  },
  {
    heading: "2. Information you give us about yourself",
    paragraphs: [
      "When you create an account we collect your phone number (used for sign-in), your name, your email address, and optionally your gender and date of birth. Sign-in is handled by Google Firebase Authentication.",
    ],
  },
  {
    heading: "3. Information you give us about other people",
    paragraphs: [
      "Kinvia only works because people record details about their relatives. When you add someone to a tree you may provide their name, their name in Hindi, their relationships, gender, date of birth, photograph, blood group, marriage and anniversary dates, date of passing, occupation, and business details.",
      "Most of these people are not Kinvia users and have not agreed to anything. That places a real responsibility on you: add only what you have a good reason to record, and only what you would be comfortable defending to the person concerned. If they ask you to remove it, remove it.",
      "We ask you not to add details about living children beyond what is necessary, and never to add contact numbers, identity-document numbers or financial information about anyone.",
    ],
  },
  {
    heading: "4. Who can see what",
    paragraphs: [
      "Family trees are visible to the person who created the tree, to anyone that person has invited or granted access to, and to Kinvia administrators. They are not browsable by other users.",
      "Business listings are different by design. A business you add — its name, category, description and contact details — is meant to be found, and is visible to every signed-in user searching in that location.",
      "Some information is shown publicly to visitors who are not signed in: the locations that have trees, and counts such as how many families and members are recorded there. We do not publish living people's birth dates, photographs, blood groups or contact details to unauthenticated visitors.",
    ],
  },
  {
    heading: "5. Community information",
    paragraphs: [
      "Trees carry caste and sub-caste attributes, which you choose when creating a tree. We use them only to help you find the right family tree. We do not use them for advertising, profiling, scoring or any form of ranking, and we do not sell or share them.",
    ],
  },
  {
    heading: "6. Why we process your data",
    bullets: [
      "To operate your account and sign you in.",
      "To build, display and share the family trees you take part in.",
      "To run access requests, invitations and approvals between users.",
      "To send you notifications about requests, invitations and family events, where you have enabled them.",
      "To keep the service secure and to investigate misuse.",
      "To meet legal obligations.",
    ],
  },
  {
    heading: "7. Where your data is stored",
    paragraphs: [
      "Your data is held in managed cloud infrastructure. We use Google Cloud and Firebase for hosting and authentication, Supabase for the database and for photographs, and Cloudflare R2 for file storage. Our primary database is hosted in the Asia-Pacific (Mumbai) region.",
      "These providers process data on our instructions. We do not sell personal data, and we do not share it with advertisers.",
    ],
  },
  {
    heading: "8. How long we keep it",
    paragraphs: [
      "Account data is kept while your account exists. If you delete your account we remove your account record and your login history.",
      "Family-tree records may remain after your account is deleted, because a tree is shared work and removing one contributor's entries would break the family structure for everyone else. If you want specific entries removed rather than just your account, tell us and we will deal with them individually.",
    ],
  },
  {
    heading: "9. Your rights",
    paragraphs: [
      "You may ask us for a copy of the personal data we hold about you, ask us to correct anything inaccurate, ask us to delete it, or withdraw a consent you previously gave. Write to support@kinvia.in and we will respond within 30 days.",
      "These rights are not limited to account holders. If you have been added to a family tree by a relative and you want your entry corrected or removed, contact us and we will act on it. You do not need a Kinvia account to make that request, and we will not require you to create one.",
    ],
  },
  {
    heading: "10. Children",
    paragraphs: [
      "Kinvia is not intended for use by anyone under 18, and you must not create an account if you are under 18.",
      "Children do appear in family trees, added by adult relatives. We do not show details of people recorded as being under 18 to unauthenticated visitors, and we do not use anyone's data for behavioural monitoring or targeted advertising. If you are a parent or guardian and want a child's entry corrected or removed, contact us and we will act on it promptly.",
    ],
  },
  {
    heading: "11. Security",
    paragraphs: [
      "We use encrypted connections, authenticated access, and permission checks on every change to tree data. No service can promise perfect security, and you should keep your sign-in details to yourself.",
    ],
  },
  {
    heading: "12. Changes",
    paragraphs: [
      "If we make a significant change to this policy we will tell you in the app before it takes effect. Continuing to use Kinvia after that means you accept the updated policy.",
    ],
  },
  {
    heading: "13. Contact and grievances",
    paragraphs: [
      "For any privacy question, correction, deletion request or complaint, write to support@kinvia.in. If you are not satisfied with our response you may escalate to the Data Protection Board of India.",
    ],
  },
];

export const PrivacyPolicyPage: React.FC = () => (
  <>
    <Helmet>
      <title>Privacy Policy - Kinvia</title>
      <meta
        name="description"
        content="How Kinvia collects, uses, shares and protects personal data in family trees and business listings."
      />
    </Helmet>

    <LegalDocument
      title="Privacy Policy"
      lastUpdated="29 August 2026"
      intro="This policy explains what Kinvia collects, who can see it, and what you can ask us to do about it. It covers your own account details and — just as importantly — the details you record about your relatives."
      sections={SECTIONS}
      siblingLabel="Terms of Use"
      siblingTo="/terms"
    />
  </>
);

export default PrivacyPolicyPage;
