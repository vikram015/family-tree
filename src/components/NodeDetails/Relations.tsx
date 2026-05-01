import React, { memo, useCallback } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  Chip,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import dayjs from "dayjs";

interface RelationsProps {
  title: string;
  items: readonly any[];
  onSelect: (nodeId: string) => void;
}

export const Relations = memo(function Relations({
  title,
  items,
  onSelect,
}: RelationsProps) {
  const selectHandler = useCallback(
    (id: string) => () => onSelect(id),
    [onSelect],
  );

  const formatRelationDate = (value?: string) => {
    if (!value) return null;
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.format("DD/MM/YYYY") : value;
  };

  const getSecondaryText = (item: any) => {
    const relationType = item?.type || "";
    const startDate = formatRelationDate(item?.startDate);
    const endDate = formatRelationDate(item?.endDate);

    if (startDate || endDate) {
      const relationRange = `${startDate || "Unknown"} - ${endDate || "Present"}`;
      return relationType ? `${relationType} | ${relationRange}` : relationRange;
    }

    return relationType;
  };

  return (
    <Accordion sx={{ borderRadius: 3, "&:before": { display: "none" } }}>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls={`rel-list-${title}`}
        id={`rel-header-${title}`}
      >
        <Typography sx={{ flexGrow: 1 }}>{title}</Typography>
        <Chip label={items.length} size="small" />
      </AccordionSummary>
      <AccordionDetails sx={{ p: 0 }}>
        {items.length > 0 ? (
          <List>
            {items.map((item, idx) => (
              <ListItem key={idx} disablePadding>
                <ListItemButton onClick={selectHandler(item.id)}>
                  <ListItemText primary={item.name} secondary={getSecondaryText(item)} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ p: 2, textAlign: "center" }}
          >
            No {title.toLowerCase()} added yet
          </Typography>
        )}
      </AccordionDetails>
    </Accordion>
  );
});
