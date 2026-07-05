import React, { useCallback, useRef, useState } from "react";
import {
  Autocomplete,
  type AutocompleteProps,
  type AutocompleteRenderInputParams,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

interface FullScreenMobilePickerRenderProps {
  dialogOpen: boolean;
  isMobile: boolean;
  openDialog: () => void;
  closeDialog: () => void;
  suppressOpenRef: React.MutableRefObject<boolean>;
}

interface FullScreenMobilePickerProps {
  title: string;
  children: (props: FullScreenMobilePickerRenderProps) => React.ReactNode;
  dialogContent: (props: FullScreenMobilePickerRenderProps) => React.ReactNode;
  closeLabel?: string;
}

export const FullScreenMobilePicker: React.FC<FullScreenMobilePickerProps> = ({
  title,
  children,
  dialogContent,
  closeLabel,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [dialogOpen, setDialogOpen] = useState(false);
  const suppressOpenRef = useRef(false);

  const closeDialog = useCallback(() => {
    suppressOpenRef.current = true;
    setDialogOpen(false);

    window.setTimeout(() => {
      suppressOpenRef.current = false;
    }, 250);
  }, []);

  const openDialog = useCallback(() => {
    if (!isMobile || suppressOpenRef.current) {
      return;
    }
    setDialogOpen(true);
  }, [isMobile]);

  const renderProps = {
    dialogOpen,
    isMobile,
    openDialog,
    closeDialog,
    suppressOpenRef,
  };

  return (
    <>
      {children(renderProps)}
      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        fullScreen={isMobile}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            pl: 2,
            pr: 1.5,
            py: 1.5,
          }}
        >
          {title}
          <IconButton
            aria-label={closeLabel || `Close ${title}`}
            edge="end"
            onClick={(event) => {
              event.stopPropagation();
              closeDialog();
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {dialogContent(renderProps)}
        </DialogContent>
      </Dialog>
    </>
  );
};

type FullScreenMobileAutocompleteProps<
  T,
  Multiple extends boolean | undefined,
  DisableClearable extends boolean | undefined,
  FreeSolo extends boolean | undefined,
> = Omit<
  AutocompleteProps<T, Multiple, DisableClearable, FreeSolo>,
  "renderInput"
> & {
  pickerTitle: string;
  closeLabel?: string;
  closeOnSelect?: boolean;
  renderInput: (params: AutocompleteRenderInputParams) => React.ReactElement;
};

function enhanceInput(
  input: React.ReactElement,
  options: {
    autoFocus?: boolean;
    onClick?: React.MouseEventHandler;
    onFocus?: React.FocusEventHandler;
    readOnly?: boolean;
  },
) {
  const existingInputProps = input.props.inputProps || {};

  return React.cloneElement(input, {
    autoFocus: options.autoFocus ?? input.props.autoFocus,
    onClick: options.onClick
      ? (event: React.MouseEvent) => {
          input.props.onClick?.(event);
          options.onClick?.(event);
        }
      : input.props.onClick,
    onFocus: options.onFocus
      ? (event: React.FocusEvent) => {
          input.props.onFocus?.(event);
          options.onFocus?.(event);
        }
      : input.props.onFocus,
    inputProps: {
      ...existingInputProps,
      readOnly: options.readOnly ?? existingInputProps.readOnly,
    },
  });
}

export function FullScreenMobileAutocomplete<
  T,
  Multiple extends boolean | undefined = false,
  DisableClearable extends boolean | undefined = false,
  FreeSolo extends boolean | undefined = false,
>({
  pickerTitle,
  closeLabel,
  closeOnSelect = true,
  renderInput,
  onChange,
  ...autocompleteProps
}: FullScreenMobileAutocompleteProps<T, Multiple, DisableClearable, FreeSolo>) {
  return (
    <FullScreenMobilePicker
      title={pickerTitle}
      closeLabel={closeLabel}
      dialogContent={({ closeDialog }) => (
        <Autocomplete<T, Multiple, DisableClearable, FreeSolo>
          {...autocompleteProps}
          onChange={(event, value, reason, details) => {
            onChange?.(event, value, reason, details);
            if (closeOnSelect && reason === "selectOption") {
              closeDialog();
            }
          }}
          renderInput={(params) =>
            enhanceInput(renderInput(params), { autoFocus: true })
          }
        />
      )}
    >
      {({ isMobile, openDialog }) => (
        <Autocomplete<T, Multiple, DisableClearable, FreeSolo>
          {...autocompleteProps}
          open={isMobile ? false : autocompleteProps.open}
          onChange={onChange}
          renderInput={(params) =>
            enhanceInput(renderInput(params), {
              onClick: openDialog,
              onFocus: openDialog,
              readOnly: isMobile,
            })
          }
        />
      )}
    </FullScreenMobilePicker>
  );
}
