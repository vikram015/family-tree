import React from "react";
import { Helmet } from "react-helmet-async";
import { Container, Typography } from "@mui/material";

export const FamousPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Famous Personalities - Kinvia | Notable Family Members</title>
        <meta
          name="description"
          content="Celebrate and document famous personalities and notable members of your family tree. Highlight achievements and contributions."
        />
        <meta
          name="keywords"
          content="famous personalities, notable family members, achievements, family pride, genealogy"
        />
        <meta property="og:title" content="Famous Personalities - Kinvia" />
        <meta
          property="og:description"
          content="Celebrate notable members of your family tree."
        />
      </Helmet>
      <Container maxWidth="lg" sx={{ mt: 8, textAlign: "center" }}>
        <Typography variant="h4" gutterBottom>
          Famous Personality
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Coming soon...
        </Typography>
      </Container>
    </>
  );
};
