import React from "react";
import StoreIcon from "@mui/icons-material/Store";
import AgricultureIcon from "@mui/icons-material/Agriculture";
import ComputerIcon from "@mui/icons-material/Computer";
import SchoolIcon from "@mui/icons-material/School";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import EngineeringIcon from "@mui/icons-material/Engineering";
import ApartmentIcon from "@mui/icons-material/Apartment";
import BusinessIcon from "@mui/icons-material/Business";
import { businessCategoryColor, normalizeCategory } from "./businessCategories";

/**
 * The icon for a business category, tinted with that category's colour.
 *
 * Separate from ./businessCategories only because that file is plain .ts and
 * this returns JSX — the two are one vocabulary and should change together.
 */
export function businessCategoryIcon(category?: string | null, size = 24) {
  const color = businessCategoryColor(category);
  switch (normalizeCategory(category)) {
    case "retail":
      return <StoreIcon sx={{ fontSize: size, color }} />;
    case "agriculture":
      return <AgricultureIcon sx={{ fontSize: size, color }} />;
    case "it":
      return <ComputerIcon sx={{ fontSize: size, color }} />;
    case "education":
      return <SchoolIcon sx={{ fontSize: size, color }} />;
    case "healthcare":
      return <LocalHospitalIcon sx={{ fontSize: size, color }} />;
    case "engineering":
      return <EngineeringIcon sx={{ fontSize: size, color }} />;
    case "properties":
      return <ApartmentIcon sx={{ fontSize: size, color }} />;
    default:
      return <BusinessIcon sx={{ fontSize: size, color }} />;
  }
}
