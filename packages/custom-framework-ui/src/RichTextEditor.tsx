/**
 * Tiptap-based rich text editor that mirrors the host app's RichTextEditor
 * (Clients/src/presentation/components/RichTextEditor) for plugin drawers.
 *
 * Toolbar order matches the system's `toolbar="full"` variant 1:1.
 */

import React, { useEffect, useCallback } from "react";
import {
  Box,
  Divider,
  IconButton,
  MenuItem,
  Select as MuiSelect,
  Stack,
  Tooltip,
  useTheme,
} from "@mui/material";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Code,
  Quote,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Table as TableIcon,
  Undo2,
  Redo2,
  Highlighter,
  Superscript as SuperscriptIcon,
  Subscript as SubscriptIcon,
} from "lucide-react";

const ICON_SIZE = 16;

interface ToolbarItem {
  key: string;
  title: string;
  icon: React.ReactNode;
  action: () => void;
  isActive?: boolean;
  dividerAfter?: boolean;
}

interface RichTextEditorProps {
  initialContent?: string;
  onContentChange?: (html: string) => void;
  isEditable?: boolean;
  placeholder?: string;
  height?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  initialContent = "",
  onContentChange,
  isEditable = true,
  placeholder,
  height = "120px",
}) => {
  const theme = useTheme();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer" } }),
      Highlight,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Subscript,
      Superscript,
      ...(placeholder ? [Placeholder.configure({ placeholder })] : []),
    ],
    content: initialContent || "",
    editable: isEditable,
    onUpdate: ({ editor: e }) => {
      onContentChange?.(e.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const incoming = initialContent ?? "";
    if (incoming !== editor.getHTML()) {
      editor.commands.setContent(incoming, { emitUpdate: false });
    }
  }, [editor, initialContent]);

  useEffect(() => {
    if (editor) editor.setEditable(isEditable);
  }, [editor, isEditable]);

  useEffect(() => {
    return () => {
      editor?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = useCallback(
    (fn: () => void) => {
      if (!editor || !isEditable) return;
      fn();
    },
    [editor, isEditable],
  );

  if (!editor) return null;

  const borderColor = theme.palette.divider || "#d0d5dd";

  const items: ToolbarItem[] = [
    {
      key: "undo",
      title: "Undo",
      icon: <Undo2 size={ICON_SIZE} />,
      action: () => run(() => editor.chain().focus().undo().run()),
    },
    {
      key: "redo",
      title: "Redo",
      icon: <Redo2 size={ICON_SIZE} />,
      action: () => run(() => editor.chain().focus().redo().run()),
      dividerAfter: true,
    },
    {
      key: "bold",
      title: "Bold",
      icon: <Bold size={ICON_SIZE} />,
      action: () => run(() => editor.chain().focus().toggleBold().run()),
      isActive: editor.isActive("bold"),
    },
    {
      key: "italic",
      title: "Italic",
      icon: <Italic size={ICON_SIZE} />,
      action: () => run(() => editor.chain().focus().toggleItalic().run()),
      isActive: editor.isActive("italic"),
    },
    {
      key: "strike",
      title: "Strikethrough",
      icon: <Strikethrough size={ICON_SIZE} />,
      action: () => run(() => editor.chain().focus().toggleStrike().run()),
      isActive: editor.isActive("strike"),
      dividerAfter: true,
    },
    {
      key: "ul",
      title: "Bullet list",
      icon: <List size={ICON_SIZE} />,
      action: () => run(() => editor.chain().focus().toggleBulletList().run()),
      isActive: editor.isActive("bulletList"),
    },
    {
      key: "ol",
      title: "Numbered list",
      icon: <ListOrdered size={ICON_SIZE} />,
      action: () => run(() => editor.chain().focus().toggleOrderedList().run()),
      isActive: editor.isActive("orderedList"),
      dividerAfter: true,
    },
    {
      key: "underline",
      title: "Underline",
      icon: <UnderlineIcon size={ICON_SIZE} />,
      action: () => run(() => editor.chain().focus().toggleUnderline().run()),
      isActive: editor.isActive("underline"),
    },
    {
      key: "superscript",
      title: "Superscript",
      icon: <SuperscriptIcon size={ICON_SIZE} />,
      action: () => run(() => editor.chain().focus().toggleSuperscript().run()),
      isActive: editor.isActive("superscript"),
    },
    {
      key: "subscript",
      title: "Subscript",
      icon: <SubscriptIcon size={ICON_SIZE} />,
      action: () => run(() => editor.chain().focus().toggleSubscript().run()),
      isActive: editor.isActive("subscript"),
    },
    {
      key: "highlight",
      title: "Highlight",
      icon: <Highlighter size={ICON_SIZE} />,
      action: () => run(() => editor.chain().focus().toggleHighlight().run()),
      isActive: editor.isActive("highlight"),
    },
    {
      key: "code",
      title: "Code block",
      icon: <Code size={ICON_SIZE} />,
      action: () => run(() => editor.chain().focus().toggleCodeBlock().run()),
      isActive: editor.isActive("codeBlock"),
      dividerAfter: true,
    },
    {
      key: "blockquote",
      title: "Blockquote",
      icon: <Quote size={ICON_SIZE} />,
      action: () => run(() => editor.chain().focus().toggleBlockquote().run()),
      isActive: editor.isActive("blockquote"),
    },
    {
      key: "hr",
      title: "Horizontal rule",
      icon: <Minus size={ICON_SIZE} />,
      action: () => run(() => editor.chain().focus().setHorizontalRule().run()),
      dividerAfter: true,
    },
    {
      key: "align-left",
      title: "Align left",
      icon: <AlignLeft size={ICON_SIZE} />,
      action: () => run(() => editor.chain().focus().setTextAlign("left").run()),
    },
    {
      key: "align-center",
      title: "Align center",
      icon: <AlignCenter size={ICON_SIZE} />,
      action: () => run(() => editor.chain().focus().setTextAlign("center").run()),
    },
    {
      key: "align-right",
      title: "Align right",
      icon: <AlignRight size={ICON_SIZE} />,
      action: () => run(() => editor.chain().focus().setTextAlign("right").run()),
      dividerAfter: true,
    },
    {
      key: "link",
      title: editor.isActive("link") ? "Remove link" : "Insert link",
      icon: <LinkIcon size={ICON_SIZE} />,
      action: () =>
        run(() => {
          if (editor.isActive("link")) {
            editor.chain().focus().unsetLink().run();
            return;
          }
          const url = window.prompt("Enter URL:");
          if (url) editor.chain().focus().setLink({ href: url }).run();
        }),
      isActive: editor.isActive("link"),
    },
    {
      key: "table",
      title: "Insert table",
      icon: <TableIcon size={ICON_SIZE} />,
      action: () =>
        run(() =>
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
        ),
    },
  ];

  const currentHeading = editor.isActive("heading", { level: 1 })
    ? "h1"
    : editor.isActive("heading", { level: 2 })
      ? "h2"
      : editor.isActive("heading", { level: 3 })
        ? "h3"
        : "p";

  return (
    <Stack className="vw-plugin-rich-text-editor">
      {/* Toolbar — flex-wrap to fit, matches host's Box pattern */}
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "2px",
          padding: "4px",
          border: `1px solid ${borderColor}`,
          borderBottom: "none",
          borderRadius: "4px 4px 0 0",
          backgroundColor: theme.palette.background.default,
        }}
      >
        {/* Heading selector */}
        <MuiSelect
          size="small"
          value={currentHeading}
          onChange={(e) => {
            const val = e.target.value as string;
            if (val === "p") editor.chain().focus().setParagraph().run();
            else if (val === "h1") editor.chain().focus().toggleHeading({ level: 1 }).run();
            else if (val === "h2") editor.chain().focus().toggleHeading({ level: 2 }).run();
            else if (val === "h3") editor.chain().focus().toggleHeading({ level: 3 }).run();
          }}
          disabled={!isEditable}
          sx={{
            "height": "28px",
            "fontSize": 12,
            "minWidth": 90,
            "mr": "2px",
            "& .MuiSelect-select": { py: "4px" },
          }}
        >
          <MenuItem value="p" sx={{ fontSize: 12 }}>
            Normal
          </MenuItem>
          <MenuItem value="h1" sx={{ fontSize: 12 }}>
            Heading 1
          </MenuItem>
          <MenuItem value="h2" sx={{ fontSize: 12 }}>
            Heading 2
          </MenuItem>
          <MenuItem value="h3" sx={{ fontSize: 12 }}>
            Heading 3
          </MenuItem>
        </MuiSelect>

        <Divider orientation="vertical" flexItem sx={{ mx: "2px", my: "4px" }} />

        {items.map((item) => (
          <React.Fragment key={item.key}>
            <Tooltip title={item.title} arrow placement="top">
              <span>
                <IconButton
                  size="small"
                  onClick={item.action}
                  disabled={!isEditable}
                  sx={{
                    "padding": "4px",
                    "borderRadius": "4px",
                    "color": item.isActive ? theme.palette.primary.main : "#475467",
                    "backgroundColor": item.isActive ? "rgba(16, 24, 40, 0.04)" : "transparent",
                    "&:hover": { backgroundColor: "rgba(16, 24, 40, 0.06)" },
                  }}
                >
                  {item.icon}
                </IconButton>
              </span>
            </Tooltip>
            {item.dividerAfter && (
              <Divider orientation="vertical" flexItem sx={{ mx: "2px", my: "4px" }} />
            )}
          </React.Fragment>
        ))}
      </Box>

      {/* Editor body */}
      <Box
        sx={{
          "padding": "12px 14px",
          "minHeight": height,
          "border": `1px solid ${borderColor}`,
          "borderRadius": "0 0 4px 4px",
          "backgroundColor": "#fff",
          "fontSize": 13,
          "lineHeight": 1.6,
          "& .ProseMirror": { outline: "none", minHeight: 100 },
          "& .ProseMirror p.is-editor-empty:first-of-type::before": {
            color: "#98A2B3",
            content: "attr(data-placeholder)",
            float: "left",
            height: 0,
            pointerEvents: "none",
          },
          "& .ProseMirror > p": { margin: 0, marginBottom: "0.5em" },
          "& .ProseMirror h1": { fontSize: 22, fontWeight: 700, margin: "0.5em 0" },
          "& .ProseMirror h2": { fontSize: 18, fontWeight: 700, margin: "0.5em 0" },
          "& .ProseMirror h3": { fontSize: 15, fontWeight: 600, margin: "0.5em 0" },
          "& .ProseMirror ul, & .ProseMirror ol": { paddingLeft: "1.5em", margin: "0.25em 0" },
          "& .ProseMirror code": {
            backgroundColor: "#f4f4f5",
            padding: "0 4px",
            borderRadius: "3px",
            fontSize: 12,
          },
          "& .ProseMirror pre": {
            backgroundColor: "#0f172a",
            color: "#f8fafc",
            padding: "10px 12px",
            borderRadius: 6,
            fontSize: 12,
            overflowX: "auto",
          },
          "& .ProseMirror a": { color: theme.palette.primary.main, textDecoration: "underline" },
          "& .ProseMirror blockquote": {
            borderLeft: "3px solid #d0d5dd",
            paddingLeft: "12px",
            margin: "0.5em 0",
            color: "#475467",
          },
          "& .ProseMirror hr": { border: "none", borderTop: "1px solid #d0d5dd", margin: "1em 0" },
          "& .ProseMirror mark": { backgroundColor: "#fff2a8", padding: "0 2px" },
          "& .ProseMirror table": {
            borderCollapse: "collapse",
            margin: "0.5em 0",
            width: "100%",
            tableLayout: "fixed",
          },
          "& .ProseMirror th, & .ProseMirror td": {
            border: "1px solid #d0d5dd",
            padding: "6px 8px",
            verticalAlign: "top",
          },
          "& .ProseMirror th": { backgroundColor: "#f9fafb", fontWeight: 600 },
        }}
      >
        <EditorContent editor={editor} />
      </Box>
    </Stack>
  );
};

export default RichTextEditor;
