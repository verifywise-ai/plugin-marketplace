/**
 * Minimal Tiptap-based rich text editor that mirrors the host app's
 * RichTextEditor visual style for use inside plugin drawers.
 *
 * Output is HTML (matches host).
 */

import React, { useEffect } from "react";
import { Box, IconButton, Stack, Tooltip, useTheme } from "@mui/material";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Underline as UnderlineIcon,
  Strikethrough as StrikeIcon,
  List as ListIcon,
  ListOrdered as OrderedListIcon,
  Link as LinkIcon,
  Code as CodeIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
} from "lucide-react";

interface RichTextEditorProps {
  initialContent?: string;
  onContentChange?: (html: string) => void;
  isEditable?: boolean;
  placeholder?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  initialContent = "",
  onContentChange,
  isEditable = true,
  placeholder = "Type your answer...",
}) => {
  const theme = useTheme();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer" } }),
      Placeholder.configure({ placeholder }),
    ],
    content: initialContent || "",
    editable: isEditable,
    onUpdate: ({ editor: e }) => {
      onContentChange?.(e.getHTML());
    },
  });

  useEffect(() => {
    if (editor && initialContent !== editor.getHTML()) {
      editor.commands.setContent(initialContent || "", { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialContent]);

  useEffect(() => {
    if (editor) editor.setEditable(isEditable);
  }, [editor, isEditable]);

  if (!editor) return null;

  const borderColor = theme.palette.divider || "#d0d5dd";

  const ToolbarBtn: React.FC<{
    title: string;
    active?: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }> = ({ title, active, onClick, children }) => (
    <Tooltip title={title} arrow placement="top">
      <span>
        <IconButton
          size="small"
          onClick={onClick}
          disabled={!isEditable}
          sx={{
            "padding": "4px",
            "borderRadius": "4px",
            "color": active ? theme.palette.primary.main : "#475467",
            "backgroundColor": active ? "rgba(16, 24, 40, 0.04)" : "transparent",
            "&:hover": { backgroundColor: "rgba(16, 24, 40, 0.06)" },
          }}
        >
          {children}
        </IconButton>
      </span>
    </Tooltip>
  );

  const handleLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL", prev || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <Box
      sx={{
        border: `1px solid ${borderColor}`,
        borderRadius: "4px",
        overflow: "hidden",
        backgroundColor: "#fff",
      }}
    >
      {/* Toolbar */}
      <Stack
        direction="row"
        gap={0.5}
        alignItems="center"
        sx={{
          padding: "6px 8px",
          borderBottom: `1px solid ${borderColor}`,
          backgroundColor: "#fafafa",
          flexWrap: "wrap",
        }}
      >
        <ToolbarBtn title="Undo" onClick={() => editor.chain().focus().undo().run()}>
          <UndoIcon size={16} />
        </ToolbarBtn>
        <ToolbarBtn title="Redo" onClick={() => editor.chain().focus().redo().run()}>
          <RedoIcon size={16} />
        </ToolbarBtn>
        <Box sx={{ width: 1, height: 18, backgroundColor: borderColor, mx: 0.5 }} />
        <ToolbarBtn
          title="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <BoldIcon size={16} />
        </ToolbarBtn>
        <ToolbarBtn
          title="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <ItalicIcon size={16} />
        </ToolbarBtn>
        <ToolbarBtn
          title="Underline"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon size={16} />
        </ToolbarBtn>
        <ToolbarBtn
          title="Strikethrough"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <StrikeIcon size={16} />
        </ToolbarBtn>
        <Box sx={{ width: 1, height: 18, backgroundColor: borderColor, mx: 0.5 }} />
        <ToolbarBtn
          title="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <ListIcon size={16} />
        </ToolbarBtn>
        <ToolbarBtn
          title="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <OrderedListIcon size={16} />
        </ToolbarBtn>
        <ToolbarBtn
          title="Code"
          active={editor.isActive("codeBlock")}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          <CodeIcon size={16} />
        </ToolbarBtn>
        <ToolbarBtn title="Link" active={editor.isActive("link")} onClick={handleLink}>
          <LinkIcon size={16} />
        </ToolbarBtn>
      </Stack>

      {/* Body */}
      <Box
        sx={{
          "padding": "12px 14px",
          "minHeight": 120,
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
        }}
      >
        <EditorContent editor={editor} />
      </Box>
    </Box>
  );
};

export default RichTextEditor;
