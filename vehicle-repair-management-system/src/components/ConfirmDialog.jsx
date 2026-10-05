"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Shared confirm modal for every admin page (delete mechanic, deactivate
// staff, discontinue part...). Parent owns `open` and the async work; this
// only renders. Pass `destructive` for red confirm buttons.
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  destructive = false,
  loading = false,
  error = null,
  onConfirm,
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <p role="alert" className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            {error}
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            // keep the dialog open until the request finishes
            onClick={(e) => {
              e.preventDefault();
              onConfirm?.();
            }}
            className={destructive ? "bg-red-600 text-white hover:bg-red-700" : ""}
          >
            {loading ? "Working..." : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}