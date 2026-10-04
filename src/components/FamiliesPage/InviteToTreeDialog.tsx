import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import IosShareIcon from "@mui/icons-material/IosShare";
import { ApiService } from "../../services/apiService";
import { useNotificationPrompt } from "../context/NotificationPromptContext";
import { phoneFromCustomFields } from "../Business/businessContact";
import { InviteCollaboratorDialog } from "./InviteCollaboratorDialog";

/** The person an invite is for, when it is scoped to one branch. */
export interface InvitePersonTarget {
  id: string;
  name: string;
}

export interface InviteToTreeDialogProps {
  open: boolean;
  onClose: () => void;
  treeId: string;
  /** Branch root to invite to. Without it the dialog starts on the full tree. */
  person?: InvitePersonTarget | null;
  /** Fix the branch person (opened from a node or a dashboard row). */
  lockPerson?: boolean;
  /** Whether "Full tree" may be chosen — only for full-tree editors. */
  allowFullTree?: boolean;
  /** Overrides the number looked up from the person's details. */
  initialPhone?: string | null;
  /**
   * The invite is for `person` themselves (not someone helping with their
   * branch): accepting also links the invitee's account to that profile.
   */
  linkToPerson?: boolean;
}

/** Ten local digits from whatever was stored ("+91 98765-43210" → "9876543210"). */
function localDigits(value: string | null | undefined): string {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

/**
 * Invite someone to a tree, end to end: the form, the request, and handing the
 * link over.
 *
 * Shared by the tree page, a person's details and the dashboard so they all
 * behave the same. The link is never shared or copied automatically: browsers
 * only allow the share sheet and clipboard straight from a tap, and the tap was
 * spent waiting for the server — which is what made a created invite report
 * "Failed to create invite" and never reach anyone. Each way of sending the
 * link is its own button instead.
 */
export const InviteToTreeDialog: React.FC<InviteToTreeDialogProps> = ({
  open,
  onClose,
  treeId,
  person,
  lockPerson = false,
  allowFullTree = true,
  initialPhone,
  linkToPerson = false,
}) => {
  const { offerNotifications } = useNotificationPrompt();
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("write");
  const [scope, setScope] = useState<"full" | "branch">("full");
  const [personId, setPersonId] = useState("");
  const [personSearch, setPersonSearch] = useState("");
  const [personName, setPersonName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Set once the invite exists: either a link to send, or access granted. */
  const [result, setResult] = useState<
    | { kind: "link"; link: string; text: string; phone: string; personName: string }
    | { kind: "granted"; name: string; linked: boolean }
    | null
  >(null);
  const [copied, setCopied] = useState(false);

  // Fresh form on every opening — nothing carries over from the last invite.
  useEffect(() => {
    if (!open) return;
    setRole("write");
    setScope(person ? "branch" : allowFullTree ? "full" : "branch");
    setPersonId(person?.id || "");
    setPersonSearch(person?.name || "");
    setPersonName(person?.name || "");
    setPhone(localDigits(initialPhone));
    setBusy(false);
    setError(null);
    setResult(null);
    setCopied(false);
  }, [open, person, allowFullTree, initialPhone]);

  // A number already on the person's profile is the one to invite. Fetched
  // here so every entry point gets it; a number typed meanwhile is kept.
  useEffect(() => {
    if (!open || !person?.id || localDigits(initialPhone)) return;
    let cancelled = false;
    ApiService.getPersonCustomFields(person.id)
      .then((fields) => {
        const found = localDigits(phoneFromCustomFields(fields));
        if (!cancelled && found.length === 10) {
          setPhone((current) => current || found);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [open, person, initialPhone]);

  const handleCreate = useCallback(async () => {
    if (!treeId) return;
    const branchId = scope === "branch" ? personId || null : null;
    if (scope === "branch" && !branchId) {
      setError("Choose the person whose branch they can edit.");
      return;
    }
    const digits = localDigits(phone);
    setBusy(true);
    setError(null);
    try {
      const invite = await ApiService.createTreeInvite(treeId, {
        role,
        personId: branchId,
        invitedPhone: digits ? `+91${digits}` : null,
        linkToPerson: Boolean(linkToPerson && branchId),
      });
      if (invite.granted) {
        setResult({ kind: "granted", name: invite.user?.name || "They", linked: Boolean(invite.linked) });
        return;
      }
      // Build the link on this site's domain; the backend's host is fixed.
      const fallback = `${window.location.origin}/families?tree=${treeId}&inviteToken=${invite.inviteToken || ""}`;
      let link = fallback;
      if (invite.inviteLink) {
        try {
          const parsed = new URL(invite.inviteLink);
          link = `${window.location.origin}${parsed.pathname}${parsed.search}${parsed.hash}`;
        } catch {
          link = fallback;
        }
      }
      const who = branchId ? personName || "your branch" : "our family tree";
      setResult({
        kind: "link",
        link,
        phone: digits,
        personName: personName || "",
        text: `You're invited to help build ${branchId ? `${who}'s branch of ` : ""}our family tree on Kinvia. Open this link to join:\n${link}`,
      });
      offerNotifications("We'll let you know as soon as your invite is accepted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, [treeId, scope, personId, personName, phone, role, linkToPerson, offerNotifications]);

  const handleCopy = useCallback(async () => {
    if (result?.kind !== "link") return;
    try {
      await navigator.clipboard.writeText(result.text);
      setCopied(true);
    } catch {
      // Clipboard refused (some app views): the link is selectable below.
      setCopied(false);
      setError("Couldn't copy automatically — select the link below and copy it.");
    }
  }, [result]);

  const handleShare = useCallback(async () => {
    if (result?.kind !== "link" || !navigator.share) return;
    try {
      await navigator.share({ title: "Join our family tree", text: result.text, url: result.link });
    } catch {
      // Dismissed — nothing to do.
    }
  }, [result]);

  if (result) {
    const whatsappHref =
      result.kind === "link"
        ? `https://wa.me/${result.phone ? `91${result.phone}` : ""}?text=${encodeURIComponent(result.text)}`
        : "";
    return (
      <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {result.kind === "granted" ? "Access given" : "Send the invite"}
        </DialogTitle>
        <DialogContent>
          {result.kind === "granted" ? (
            <Alert severity="success">
              {result.name} already has an account and can open this tree now
              {result.linked ? `, linked to ${personName || "this"}'s profile.` : "."}
            </Alert>
          ) : (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                {result.phone
                  ? `Only +91 ${result.phone} can use this link. `
                  : "Anyone you send this link to can join. "}
                It works for 7 days.
                {linkToPerson && personName
                  ? ` When they join, their account is linked to ${personName}'s profile.`
                  : ""}
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<WhatsAppIcon />}
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  fullWidth
                >
                  WhatsApp
                </Button>
                <Button variant="outlined" startIcon={<ContentCopyIcon />} onClick={() => void handleCopy()} fullWidth>
                  {copied ? "Copied" : "Copy link"}
                </Button>
                {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
                  <Button variant="outlined" startIcon={<IosShareIcon />} onClick={() => void handleShare()} fullWidth>
                    Share…
                  </Button>
                )}
              </Stack>
              <TextField
                value={result.link}
                size="small"
                fullWidth
                InputProps={{ readOnly: true }}
                onFocus={(e) => e.target.select()}
                label="Invite link"
              />
              {error && <Alert severity="info">{error}</Alert>}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>Done</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <>
      <InviteCollaboratorDialog
        open={open}
        busy={busy}
        invitePhone={phone}
        inviteRole={role}
        inviteScope={scope}
        invitePersonId={personId}
        invitePersonSearch={personSearch}
        treeId={treeId}
        selectedBranchPersonName={personName || undefined}
        lockBranchPerson={lockPerson}
        allowFullTree={allowFullTree}
        error={error}
        onClose={onClose}
        onInvitePhoneChange={(value) => setPhone(value.replace(/\D/g, "").slice(0, 10))}
        onInviteRoleChange={setRole}
        onInviteScopeChange={setScope}
        onInvitePersonIdChange={(value) => {
          setPersonId(value);
          if (!value) setPersonName("");
        }}
        onInvitePersonSearchChange={setPersonSearch}
        onInvitePersonSelect={(selected) => {
          setPersonId(selected?.id || "");
          setPersonName(selected?.name || "");
          setPersonSearch(selected?.name || "");
        }}
        onCreateInvite={() => void handleCreate()}
      />
    </>
  );
};

export default InviteToTreeDialog;
