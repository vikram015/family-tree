import React from "react";
import { Helmet } from "react-helmet-async";
import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  Container,
  Paper,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Link,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import HelpOutlineOutlinedIcon from "@mui/icons-material/HelpOutlineOutlined";
import { brand } from "../../theme/brand";

type FaqItem = {
  q: string;
  a: React.ReactNode;
};

const faqs: FaqItem[] = [
  {
    q: "What is Kinvia?",
    a: "Kinvia is a digital family-tree platform that helps communities preserve their roots. You can build and explore multi-generation family trees, connect relatives across families, browse families by location, and keep a living record of lineage, relationships, and family history.",
  },
  {
    q: "How do I find myself in the family tree?",
    a: "When you first sign in, onboarding walks you through finding your place. You search for your family tree and browse it to locate the person that represents you. Once you find yourself, you can request to link that profile to your account.",
  },
  {
    q: "How does linking my profile work?",
    a: "When you pick the person that represents you, Kinvia sends a request to the tree owner for approval. Your account stays unlinked until they approve it. Once approved, that profile becomes yours and you can keep your own details up to date.",
  },
  {
    q: "How do I request edit access to a branch of the tree?",
    a: "If you want to edit part of a tree you don't already own, you can request access to a branch. The request goes to the tree owner or an administrator, who reviews it and grants write access scoped to that branch (and typically the descendants and spouses within it).",
  },
  {
    q: "Who can edit the family tree?",
    a: "Editing is permission-based. The tree owner and administrators can edit, and they can grant write access to others — either for the whole tree or scoped to a specific branch. Everyone else sees a read-only view. This keeps the shared record accurate while still letting families contribute.",
  },
  {
    q: "How do I add family members?",
    a: "If you have write access, open the tree and add parents, spouses, and children to a person, including their relationships, dates, and photos. New members appear in the tree right away for everyone who can view it.",
  },
  {
    q: "How do I add family events?",
    a: "Within a tree you have access to, you can record family events tied to the people in it, so important moments and milestones are captured alongside the lineage and preserved for future generations.",
  },
  {
    q: "What happens when a relative already exists in another family tree?",
    a: "Kinvia lets you link a placeholder relative to a real person from another family tree, so a shared relative stays connected across both families instead of being duplicated. When this involves linking a real profile, the change is reviewed and approved before it takes effect.",
  },
  {
    q: "How is my data privacy handled?",
    a: (
      <>
        Kinvia collects basic account details and the family-tree information
        you add. Family-tree and profile information may be publicly visible to
        other users through the app&apos;s read-only view, so please share only
        what you&apos;re comfortable making visible. For the full details, see
        our{" "}
        <Link component={RouterLink} to="/privacy-policy" underline="hover">
          Privacy Policy
        </Link>
        .
      </>
    ),
  },
  {
    q: "How do I give feedback?",
    a: "We'd love to hear from you. You can send feedback from the account menu in the app. You can also reach us any time at info@kinvia.in.",
  },
];

export const FAQPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>FAQ - Kinvia</title>
        <meta
          name="description"
          content="Frequently asked questions about Kinvia — how to find yourself in the tree, link your profile, request edit access, add family members and events, and manage your privacy."
        />
      </Helmet>

      <Box
        sx={{
          background: `linear-gradient(130deg, ${brand.primarySoft} 0%, ${brand.canvas} 45%, ${brand.primarySoft} 100%)`,
          minHeight: "100%",
          py: { xs: 4, md: 6 },
        }}
      >
        <Container maxWidth="md">
          <Paper
            elevation={0}
            sx={{
              borderRadius: 4,
              overflow: "hidden",
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Box
              sx={{
                p: { xs: 3, md: 5 },
                background:
                  "linear-gradient(135deg, rgba(13,110,253,0.10), rgba(22,163,74,0.10))",
              }}
            >
              <Typography variant="h3" sx={{ fontWeight: 800, lineHeight: 1.15 }}>
                Frequently asked questions
              </Typography>
              <Typography
                variant="h6"
                sx={{ mt: 1.5, color: "text.secondary", fontWeight: 500 }}
              >
                Everything you need to know about building, joining, and editing
                your family tree on Kinvia.
              </Typography>
            </Box>

            <Box sx={{ p: { xs: 2, md: 4 } }}>
              {faqs.map((item, index) => (
                <Accordion
                  key={item.q}
                  disableGutters
                  elevation={0}
                  defaultExpanded={index === 0}
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                    mb: 1.5,
                    "&:before": { display: "none" },
                    overflow: "hidden",
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    sx={{ "& .MuiAccordionSummary-content": { alignItems: "center", gap: 1 } }}
                  >
                    <HelpOutlineOutlinedIcon
                      fontSize="small"
                      sx={{ color: "primary.main" }}
                    />
                    <Typography sx={{ fontWeight: 700 }}>{item.q}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body1" color="text.secondary">
                      {item.a}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          </Paper>
        </Container>
      </Box>
    </>
  );
};

export default FAQPage;
