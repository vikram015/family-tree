import React, { useEffect, useRef } from "react";
import { Box, Divider, Stack, ToggleButton, Tooltip } from "@mui/material";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";
import FormatQuoteIcon from "@mui/icons-material/FormatQuote";
import TitleIcon from "@mui/icons-material/Title";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { isHtml, normalizeRichText } from "./richText";

/**
 * The actual TipTap editor. Loaded only through `RichTextEditor`, never
 * imported directly — ProseMirror is a large dependency and most screens never
 * open a description field.
 */

export interface RichTextEditorImplProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  disabled?: boolean;
}

/** Plain text stored before the editor existed still has to load into it. */
function toInitialContent(value: string): string {
  if (!value) return "";
  if (isHtml(value)) return value;
  return value
    .split(/\n{2,}/)
    .map(
      (paragraph) =>
        `<p>${paragraph
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\n/g, "<br>")}</p>`,
    )
    .join("");
}

const RichTextEditorImpl: React.FC<RichTextEditorImplProps> = ({
  value,
  onChange,
  placeholder,
  minHeight = 180,
  disabled = false,
}) => {
  /**
   * What the editor's document was last set to, normalised.
   *
   * TipTap fires `onUpdate` while it initialises and normalises its own
   * document, not just when someone types. Reporting that as an edit is how an
   * empty editor overwrites a value that arrived while it was still mounting —
   * which is exactly what happens when a form loads its record asynchronously.
   * Comparing against this ref tells a real edit from the editor settling.
   */
  const seededRef = useRef(normalizeRichText(toInitialContent(value)));

  const editor = useEditor({
    extensions: [StarterKit],
    content: toInitialContent(value),
    editable: !disabled,
    onUpdate: ({ editor: instance }) => {
      const html = normalizeRichText(instance.getHTML());
      if (html === seededRef.current) return;
      seededRef.current = html;
      onChange(html);
    },
  });

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  // Re-seed only when the value changes from the outside (a different business
  // loaded into the same dialog). Comparing against the editor's own HTML keeps
  // this from fighting the user's typing.
  useEffect(() => {
    // A destroyed editor has no schema, and setContent would parse against it —
    // that is `Cannot read properties of null (reading 'cached')`.
    if (!editor || editor.isDestroyed) return;
    const incoming = toInitialContent(value);
    if (normalizeRichText(editor.getHTML()) !== normalizeRichText(incoming)) {
      editor.commands.setContent(incoming, { emitUpdate: false });
      // The document now represents this value; a later update that differs
      // from it is the user's doing.
      seededRef.current = normalizeRichText(incoming);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, value]);

  if (!editor) return null;

  const button = (
    title: string,
    active: boolean,
    onClick: () => void,
    icon: React.ReactNode,
    enabled = true,
  ) => (
    <Tooltip title={title}>
      <span>
        <ToggleButton
          value={title}
          size="small"
          selected={active}
          disabled={disabled || !enabled}
          onMouseDown={(e) => e.preventDefault()} // keep the selection
          onClick={onClick}
          sx={{ border: "none", borderRadius: 1, px: 1, py: 0.5 }}
        >
          {icon}
        </ToggleButton>
      </span>
    </Tooltip>
  );

  return (
    <Box>
      <Stack
        direction="row"
        spacing={0.25}
        alignItems="center"
        flexWrap="wrap"
        sx={{
          px: 0.5,
          py: 0.5,
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "action.hover",
        }}
      >
        {button("Bold", editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), <FormatBoldIcon fontSize="small" />)}
        {button("Italic", editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), <FormatItalicIcon fontSize="small" />)}
        {button("Heading", editor.isActive("heading", { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), <TitleIcon fontSize="small" />)}
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.5 }} />
        {button("Bulleted list", editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), <FormatListBulletedIcon fontSize="small" />)}
        {button("Numbered list", editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), <FormatListNumberedIcon fontSize="small" />)}
        {button("Quote", editor.isActive("blockquote"), () => editor.chain().focus().toggleBlockquote().run(), <FormatQuoteIcon fontSize="small" />)}
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.5 }} />
        {button("Undo", false, () => editor.chain().focus().undo().run(), <UndoIcon fontSize="small" />, editor.can().undo())}
        {button("Redo", false, () => editor.chain().focus().redo().run(), <RedoIcon fontSize="small" />, editor.can().redo())}
      </Stack>

      <Box
        onClick={() => editor.chain().focus().run()}
        sx={{
          px: 1.75,
          py: 1.25,
          minHeight,
          cursor: disabled ? "default" : "text",
          "& .ProseMirror": {
            outline: "none",
            minHeight: minHeight - 20,
            fontSize: 15,
            lineHeight: 1.6,
          },
          "& .ProseMirror > :first-of-type": { mt: 0 },
          "& .ProseMirror > :last-child": { mb: 0 },
          "& .ProseMirror p": { my: 1 },
          "& .ProseMirror ul, & .ProseMirror ol": { my: 1, pl: 3 },
          "& .ProseMirror blockquote": {
            my: 1,
            pl: 2,
            borderLeft: "3px solid",
            borderColor: "divider",
            fontStyle: "italic",
          },
          "& .ProseMirror h3": { my: 1.5, fontSize: "1.1em", fontWeight: 800 },
          // Placeholder without pulling in the extension: an empty document is
          // a single empty paragraph, so target exactly that.
          "& .ProseMirror > p.is-editor-empty:first-of-type::before, & .ProseMirror > p:only-child:empty::before":
            {
              content: `"${(placeholder || "").replace(/"/g, '\\"')}"`,
              color: "text.disabled",
              float: "left",
              height: 0,
              pointerEvents: "none",
            },
        }}
      >
        <EditorContent editor={editor} />
      </Box>
    </Box>
  );
};

export default RichTextEditorImpl;
