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

  return (
    <Accordion>
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
                  <ListItemText primary={item.name} secondary={item.type} />
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
