import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { ApiService, LocationCombinationOption } from "../../services/apiService";
import { LocationPicker } from "../LocationPicker/LocationPicker";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Snackbar,
  CircularProgress,
  Box,
  Fab,
  Autocomplete,
  Tooltip,
  useMediaQuery,
  useTheme,
  createFilterOptions,
  InputAdornment,
  type FilterOptionsState,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import { useLocations } from "../hooks/useLocations";
import { useAuth } from "../hooks/useAuth";
import { useLoginModal } from "../context/LoginModalContext";
import { RichTextEditor } from "../common/RichTextEditor";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  fetchAllSubCastes,
  fetchCastes,
  selectCastes,
  selectSubCastes,
} from "../../store/slices/casteSlice";

interface AddTreeProps {
  onCreate?: (treeId: string) => void;
  variant?: "button" | "fab";
  hideTrigger?: boolean;
  open?: boolean;
  onClose?: () => void;
  initialLocationId?: string;
  initialCasteId?: string;
  initialSubCasteId?: string;
  title?: string;
}

type LookupOption = {
  id: string;
  name: string;
  casteId?: string;
};

type CreateOption = {
  id: string;
  name: string;
  inputValue: string;
  isCreateOption: true;
};

type AutocompleteOption = LookupOption | CreateOption;

const filter = createFilterOptions<AutocompleteOption>();

function isCreateOption(option: AutocompleteOption): option is CreateOption {
  return "isCreateOption" in option;
}

const inputIconSx = { color: "text.secondary" } as const;
const inputWithIconSx = {
  "& .MuiInputAdornment-root": inputIconSx,
  "& .MuiOutlinedInput-root": {
    borderRadius: 2,
  },
} as const;

const adornment = (icon: React.ReactNode) => (
  <InputAdornment position="start">{icon}</InputAdornment>
);

const autocompleteStartAdornment = (
  icon: React.ReactNode,
  params: { InputProps: { startAdornment?: React.ReactNode } },
) => (
  <>
    {adornment(icon)}
    {params.InputProps.startAdornment}
  </>
);

function renderLookupOption(
  props: React.HTMLAttributes<HTMLLIElement> & { key: React.Key },
  option: AutocompleteOption,
) {
  if (!isCreateOption(option)) {
    return <li {...props}>{option.name}</li>;
  }

  const { key, ...rest } = props;
  return (
    <Box
      component="li"
      key={key}
      {...rest}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        borderTop: "1px solid",
        borderColor: "divider",
        mt: 0.5,
        pt: 1,
        pb: 1,
      }}
    >
      <AddCircleOutlineIcon fontSize="small" color="primary" />
      <Box component="span" sx={{ fontWeight: 700, color: "primary.main" }}>
        {option.name}
      </Box>
    </Box>
  );
}

export const AddTree: React.FC<AddTreeProps> = ({
  onCreate,
  variant = "button",
  hideTrigger = false,
  open,
  onClose,
  initialLocationId,
  initialCasteId,
  initialSubCasteId,
  title = "Create a new tree",
}) => {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Redux state
  const castes = useAppSelector(selectCastes);
  const subCastes = useAppSelector(selectSubCastes);

  // Local state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCaste, setSelectedCaste] = useState<string>("");
  const [selectedSubCaste, setSelectedSubCaste] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const modalHistoryRef = useRef(false);
  const previousSelectedCasteRef = useRef("");
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [selectedLocationOption, setSelectedLocationOption] =
    useState<LocationCombinationOption | null>(null);
  const [casteInputValue, setCasteInputValue] = useState("");
  const [subCasteInputValue, setSubCasteInputValue] = useState("");
  const filteredSubCastes = useMemo(
    () => subCastes.filter((s) => !selectedCaste || s.casteId === selectedCaste),
    [subCastes, selectedCaste],
  );
  const { selectedLocation, setSelectedLocation } = useLocations();
  const { currentUser } = useAuth() as any;
  const { openLoginModal } = useLoginModal();
  const isControlledOpen = typeof open === "boolean";
  const isModalOpen = isControlledOpen ? Boolean(open) : showModal;

  // Load castes when modal opens
  useEffect(() => {
    if (isModalOpen) {
      if (castes.length === 0) {
        dispatch(fetchCastes());
      }
      if (subCastes.length === 0) {
        dispatch(fetchAllSubCastes());
      }
    }
  }, [isModalOpen, castes.length, subCastes.length, dispatch]);

  // Reset selected sub-caste when caste changes
  useEffect(() => {
    if (
      previousSelectedCasteRef.current &&
      previousSelectedCasteRef.current !== selectedCaste
    ) {
      setSelectedSubCaste("");
      setSubCasteInputValue("");
    }
    previousSelectedCasteRef.current = selectedCaste;
  }, [selectedCaste]);

  const selectedCasteOption = useMemo(
    () => castes.find((caste) => caste.id === selectedCaste) || null,
    [castes, selectedCaste],
  );

  const selectedSubCasteOption = useMemo(
    () =>
      filteredSubCastes.find((subCaste) => subCaste.id === selectedSubCaste) || null,
    [filteredSubCastes, selectedSubCaste],
  );

  const createOptionLabel = (input: string, label: string) =>
    `Add "${input.trim()}" as new ${label}`;

  const buildCreatableOptions = useCallback(
    (
      options: LookupOption[],
      params: FilterOptionsState<AutocompleteOption>,
      label: string,
    ): AutocompleteOption[] => {
      const trimmedValue = params.inputValue.trim();
      const filtered = filter(options, params);

      if (!trimmedValue) {
        return filtered;
      }

      const hasExactMatch = options.some(
        (option) => option.name.trim().toLowerCase() === trimmedValue.toLowerCase(),
      );

      if (!hasExactMatch) {
        filtered.push({
          id: `create-${label}-${trimmedValue}`,
          name: createOptionLabel(trimmedValue, label),
          inputValue: trimmedValue,
          isCreateOption: true,
        });
      }

      return filtered;
    },
    [],
  );

  const handleCreateCaste = useCallback(
    async (nameToCreate: string) => {
      const trimmedName = nameToCreate.trim();
      if (!trimmedName) {
        return;
      }

      setError(null);
      setLookupLoading(true);
      try {
        const created = await ApiService.createCaste({ name: trimmedName });
        await dispatch(fetchCastes()).unwrap();
        setSelectedCaste(created.id);
        setCasteInputValue(created.name);
      } catch (err: any) {
        setError(err?.message ?? String(err));
      } finally {
        setLookupLoading(false);
      }
    },
    [dispatch],
  );

  const handleCreateSubCaste = useCallback(
    async (nameToCreate: string) => {
      const trimmedName = nameToCreate.trim();
      if (!trimmedName || !selectedCaste) {
        return;
      }

      setError(null);
      setLookupLoading(true);
      try {
        const created = await ApiService.createSubCaste({
          name: trimmedName,
          casteId: selectedCaste,
        });
        await dispatch(fetchAllSubCastes()).unwrap();
        setSelectedSubCaste(created.id);
        setSubCasteInputValue(created.name);
      } catch (err: any) {
        setError(err?.message ?? String(err));
      } finally {
        setLookupLoading(false);
      }
    },
    [dispatch, selectedCaste],
  );

  useEffect(() => {
    if (!isModalOpen) {
      return;
    }

    setSelectedLocationId(initialLocationId || selectedLocation || "");
    setSelectedCaste(initialCasteId || "");
    setSelectedSubCaste(initialSubCasteId || "");
    setCasteInputValue("");
    setSubCasteInputValue("");
    setError(null);
    previousSelectedCasteRef.current = initialCasteId || "";
  }, [
    isModalOpen,
    initialLocationId,
    initialCasteId,
    initialSubCasteId,
    selectedLocation,
  ]);

  // Resolve the prefilled location id into the full "village, district, state"
  // option the picker renders. Setting only the id left the field looking empty,
  // so onboarding users retyped a location they had already chosen. Mirrors the
  // same lookup the header does.
  useEffect(() => {
    if (!isModalOpen) return;

    const locationId = initialLocationId || selectedLocation || "";
    if (!locationId) {
      setSelectedLocationOption(null);
      return;
    }
    if (selectedLocationOption?.locationId === locationId) return;

    let active = true;
    ApiService.searchLocationCombinations({ locationId, limit: 1 })
      .then((rows) => {
        if (active && rows?.[0]) setSelectedLocationOption(rows[0]);
      })
      .catch(() => {
        /* Non-fatal: the user can still search for the location by hand. */
      });
    return () => {
      active = false;
    };
  }, [
    isModalOpen,
    initialLocationId,
    selectedLocation,
    selectedLocationOption?.locationId,
  ]);

  useEffect(() => {
    if (!isModalOpen) {
      return;
    }

    if (selectedCasteOption) {
      setCasteInputValue(selectedCasteOption.name);
    }
  }, [isModalOpen, selectedCasteOption]);

  useEffect(() => {
    if (!isModalOpen) {
      return;
    }

    if (selectedSubCasteOption) {
      setSubCasteInputValue(selectedSubCasteOption.name);
    }
  }, [isModalOpen, selectedSubCasteOption]);

  useEffect(() => {
    if (!isModalOpen || isControlledOpen) return;

    if (!modalHistoryRef.current) {
      window.history.pushState({ modal: "create-tree" }, "");
      modalHistoryRef.current = true;
    }

    const handlePopState = () => {
      if (!modalHistoryRef.current) return;
      setShowModal(false);
      modalHistoryRef.current = false;
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isModalOpen, isControlledOpen]);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      // Create tree and store caste/subCaste as UUIDs
      const treeData = {
        name: name || "Default Tree",
        locationId: selectedLocationId || selectedLocation || null,
        description: description || null,
        caste: selectedCaste || null,
        subCaste: selectedSubCaste || null,
      };

      const newTree = await ApiService.createTree(treeData);
      const treeId = newTree.id;

      setName("");
      setDescription("");
      setSelectedCaste("");
      setSelectedSubCaste("");
      if (!isControlledOpen) {
        setShowModal(false);
      }
      onClose?.();
      if (onCreate) onCreate(treeId);
    } catch (err: any) {
      setError(err?.message ?? String(err));
      console.error("Failed to create tree:", err);
    } finally {
      setLoading(false);
    }
  };

  const openModal = () => {
    if (!currentUser) {
      openLoginModal(() => {
        // After successful login, open the modal
        setShowModal(true);
      });
      return;
    }
    setError(null);
    setName("");
    setDescription("");
    setSelectedCaste(initialCasteId || "");
    setSelectedSubCaste(initialSubCasteId || "");
    setCasteInputValue("");
    setSubCasteInputValue("");
    setSelectedLocationId(initialLocationId || selectedLocation || "");
    previousSelectedCasteRef.current = initialCasteId || "";
    if (!isControlledOpen) {
      setShowModal(true);
    }
  };

  useEffect(() => {
    if (!isControlledOpen) {
      return;
    }

    if (open && !currentUser) {
      onClose?.();
      openLoginModal();
    }
  }, [currentUser, isControlledOpen, onClose, open, openLoginModal]);

  const handleRequestOpen = () => {
    if (isControlledOpen) {
      openModal();
      return;
    }
    openModal();
  };

  const closeModal = () => {
    if (loading) return;
    if (isControlledOpen) {
      onClose?.();
      return;
    }

    setShowModal(false);
    if (modalHistoryRef.current) {
      modalHistoryRef.current = false;
      window.history.back();
    }
  };

  const isValid =
    name.trim().length >= 4 &&
    name.trim().length <= 64 &&
    !!selectedCaste &&
    !!selectedSubCaste;

  return (
    <Box>
      {!hideTrigger && variant === "fab" ? (
        <>
          <Tooltip title="Create tree" placement="left">
            <Fab
              color="primary"
              aria-label="Create tree"
              onClick={handleRequestOpen}
              sx={{
                display: { xs: "inline-flex", sm: "none" },
                opacity: 1,
                transition: "opacity 0.2s ease",
                "&:hover": {
                  opacity: 1,
                },
              }}
            >
              <AddIcon />
            </Fab>
          </Tooltip>
          <Tooltip title="Create tree" placement="left">
            <Fab
              variant="extended"
              color="primary"
              onClick={handleRequestOpen}
              sx={{
                display: { xs: "none", sm: "inline-flex" },
                opacity: 0.62,
                transition: "opacity 0.2s ease",
                "&:hover": {
                  opacity: 1,
                },
              }}
            >
              <AddIcon sx={{ mr: 1 }} />
              Create tree
            </Fab>
          </Tooltip>
        </>
      ) : !hideTrigger ? (
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleRequestOpen}
        >
          Create tree
        </Button>
      ) : null}

      <Dialog
        open={isModalOpen}
        onClose={closeModal}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, mb: 2 }}>
            <LocationPicker
              value={selectedLocationOption}
              onChange={(option) => {
                setSelectedLocationOption(option);
                const id = option?.locationId || "";
                setSelectedLocationId(id);
                if (id) {
                  setSelectedLocation(id);
                }
              }}
              disabled={loading}
              allowCreate
            />
          </Box>

          <TextField
            autoFocus
            margin="dense"
            label="Tree name"
            placeholder="e.g. Sharma Family"
            fullWidth
            variant="outlined"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            sx={[{ mt: 1, mb: 2 }, inputWithIconSx]}
            InputProps={{
              startAdornment: adornment(
                <AccountTreeOutlinedIcon fontSize="small" />,
              ),
            }}
          />

          <Autocomplete
            options={castes}
            value={selectedCasteOption}
            inputValue={casteInputValue}
            onInputChange={(_event, newInputValue) => {
              setCasteInputValue(newInputValue);
            }}
            onChange={async (_event, newValue) => {
              if (!newValue) {
                setSelectedCaste("");
                setCasteInputValue("");
                return;
              }

              if (isCreateOption(newValue)) {
                await handleCreateCaste(newValue.inputValue);
                return;
              }

              setSelectedCaste(newValue.id);
              setCasteInputValue(newValue.name);
            }}
            disabled={loading || lookupLoading}
            selectOnFocus
            clearOnBlur
            handleHomeEndKeys
            getOptionLabel={(option) =>
              isCreateOption(option) ? option.name : option.name
            }
            isOptionEqualToValue={(option, value) => option.id === value.id}
            filterOptions={(options, params) =>
              buildCreatableOptions(options, params, "caste")
            }
            renderOption={renderLookupOption}
            renderInput={(params) => (
              <TextField
                {...params}
                margin="dense"
                label="Caste"
                placeholder="Search or create caste..."
                variant="outlined"
                required
                sx={inputWithIconSx}
                InputProps={{
                  ...params.InputProps,
                  startAdornment: autocompleteStartAdornment(
                    <GroupsOutlinedIcon fontSize="small" />,
                    params,
                  ),
                }}
              />
            )}
            sx={{ mb: 2 }}
          />

          <Autocomplete
            options={filteredSubCastes}
            value={selectedSubCasteOption}
            inputValue={subCasteInputValue}
            onInputChange={(_event, newInputValue) => {
              setSubCasteInputValue(newInputValue);
            }}
            onChange={async (_event, newValue) => {
              if (!newValue) {
                setSelectedSubCaste("");
                setSubCasteInputValue("");
                return;
              }

              if (isCreateOption(newValue)) {
                await handleCreateSubCaste(newValue.inputValue);
                return;
              }

              setSelectedSubCaste(newValue.id);
              setSubCasteInputValue(newValue.name);
            }}
            disabled={loading || lookupLoading || !selectedCaste}
            selectOnFocus
            clearOnBlur
            handleHomeEndKeys
            getOptionLabel={(option) =>
              isCreateOption(option) ? option.name : option.name
            }
            isOptionEqualToValue={(option, value) => option.id === value.id}
            filterOptions={(options, params) =>
              buildCreatableOptions(options, params, "sub-caste")
            }
            renderOption={renderLookupOption}
            renderInput={(params) => (
              <TextField
                {...params}
                margin="dense"
                label="Sub-Caste"
                placeholder={
                  selectedCaste
                    ? "Search or create sub-caste..."
                    : "Select caste first"
                }
                variant="outlined"
                required
                sx={inputWithIconSx}
                InputProps={{
                  ...params.InputProps,
                  startAdornment: autocompleteStartAdornment(
                    <BadgeOutlinedIcon fontSize="small" />,
                    params,
                  ),
                }}
              />
            )}
            sx={{ mb: 2 }}
          />

          <Box sx={{ mt: 2 }}>
            <RichTextEditor
              label="Description (optional)"
              value={description}
              onChange={setDescription}
              minHeight={140}
              placeholder="e.g. A detailed description about the family"
            />
          </Box>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Error: {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeModal} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={!isValid || loading}
            variant="contained"
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? "Creating..." : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Failures surface in a portalled snackbar rather than inline. An Alert
          rendered here sits inside the same fixed, right-anchored box as the FAB,
          so it widened the box and pushed the button sideways. Success needs no
          message at all — the user is taken straight into the new tree. */}
      <Snackbar
        open={Boolean(error) && !showModal}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="error" variant="filled" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AddTree;
