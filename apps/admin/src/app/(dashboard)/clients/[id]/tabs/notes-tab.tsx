"use client";

import { useState } from "react";
import { Plus, Pin, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { createNote, updateNote, deleteNote } from "../../actions";
import { formatDistanceToNow } from "date-fns";

interface Note {
  id: string;
  content: string;
  isPinned: boolean;
  createdAt: Date;
  createdBy: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
}

interface NotesTabProps {
  client: {
    id: string;
    notes: Note[];
  };
}

export function NotesTab({ client }: NotesTabProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();

  const handleAdd = () => {
    setEditingNote(null);
    setIsFormOpen(true);
  };

  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setIsFormOpen(true);
  };

  const handleDelete = async (noteId: string) => {
    const ok = await confirm({
      title: "Delete note",
      description: "Are you sure you want to delete this note? This action cannot be undone.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteNote(noteId, client.id);
      toast.success("Note deleted");
    } catch (error) {
      toast.error("Failed to delete note");
    }
  };

  const handleTogglePin = async (note: Note) => {
    try {
      await updateNote(note.id, client.id, { isPinned: !note.isPinned });
      toast.success(note.isPinned ? "Note unpinned" : "Note pinned");
    } catch (error) {
      toast.error("Failed to update note");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const content = formData.get("content") as string;
    const isPinned = formData.get("isPinned") === "on";

    try {
      if (editingNote) {
        await updateNote(editingNote.id, client.id, { content, isPinned });
        toast.success("Note updated");
      } else {
        await createNote(client.id, content, isPinned);
        toast.success("Note added");
      }
      setIsFormOpen(false);
    } catch (error) {
      toast.error("Failed to save note");
    } finally {
      setIsLoading(false);
    }
  };

  const getAuthorName = (note: Note) => {
    if (!note.createdBy) return "Unknown";
    const { firstName, lastName } = note.createdBy;
    if (firstName && lastName) return `${firstName} ${lastName}`;
    if (firstName) return firstName;
    return "Unknown";
  };

  // Sort: pinned first, then by date
  const sortedNotes = [...client.notes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <>
    {ConfirmDialog}
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Notes</h3>
          <p className="text-sm text-muted-foreground">
            Internal notes about this client
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Note
        </Button>
      </div>

      {sortedNotes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-muted-foreground">No notes yet.</p>
            <Button onClick={handleAdd} variant="outline" className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Add First Note
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedNotes.map((note) => (
            <Card key={note.id} className={note.isPinned ? "border-amber-300 dark:border-amber-500/50" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                    {note.isPinned && (
                      <Pin className="h-4 w-4 fill-amber-400 text-amber-400" />
                    )}
                    <span className="truncate">{getAuthorName(note)}</span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleTogglePin(note)}
                      title={note.isPinned ? "Unpin" : "Pin"}
                    >
                      <Pin className={`h-4 w-4 ${note.isPinned ? "fill-current text-amber-500" : ""}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(note)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(note.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="whitespace-pre-wrap text-sm line-clamp-4">{note.content}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Note Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingNote ? "Edit Note" : "Add Note"}
            </DialogTitle>
            <DialogDescription>
              {editingNote
                ? "Update your note"
                : "Add a note about this client"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Textarea
                id="content"
                name="content"
                rows={6}
                placeholder="Write your note here..."
                defaultValue={editingNote?.content || ""}
                required
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isPinned"
                name="isPinned"
                defaultChecked={editingNote?.isPinned || false}
              />
              <Label htmlFor="isPinned" className="font-normal">
                Pin this note
              </Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : editingNote ? "Update" : "Add Note"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}
