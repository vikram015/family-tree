import React from "react";
import { Box, Stack, Typography } from "@mui/material";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import { brand } from "../../theme/brand";

/**
 * "For <name>" line for dialog headers, naming whose business or profession is
 * being added or edited. Shows `placeholder` until an owner is known.
 */
export const OwnerLine: React.FC<{ name?: string; placeholder: string }> = ({
  name,
  placeholder,
}) => (
  <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0, mt: 0.5 }}>
    <PersonOutlineIcon sx={{ fontSize: 16, color: name ? brand.primary : brand.slateMuted }} />
    <Typography sx={{ fontSize: 13, color: brand.slateMuted, minWidth: 0 }} noWrap>
      {name ? (
        <>
          For{" "}
          <Box component="span" sx={{ fontWeight: 700, color: brand.ink }}>
            {name}
          </Box>
        </>
      ) : (
        placeholder
      )}
    </Typography>
  </Stack>
);

export default OwnerLine;
