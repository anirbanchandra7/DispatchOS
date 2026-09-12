"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FileWarning } from "lucide-react";
import { format } from "date-fns";
import type { DocumentType } from "@/types";

export interface ViewableDocument {
  type: DocumentType;
  fileName?: string;
  mimeType?: string;
  dataUrl?: string;
  expiryDate?: string;
  uploadedAt?: string;
  uploadedBy?: string;
}

export function DocumentViewerDialog({
  document,
  onOpenChange,
}: {
  document: ViewableDocument | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={!!document} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        {document && (
          <>
            <DialogHeader>
              <DialogTitle>{document.type.replace(/_/g, " ")}</DialogTitle>
              <DialogDescription>
                {document.fileName ?? "No file on record"}
                {document.expiryDate && ` · Expires ${format(new Date(document.expiryDate), "MMM d, yyyy")}`}
                {document.uploadedAt && ` · Uploaded ${format(new Date(document.uploadedAt), "MMM d, yyyy")}${document.uploadedBy ? ` by ${document.uploadedBy}` : ""}`}
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-lg border bg-muted/30 min-h-[300px] flex items-center justify-center overflow-hidden">
              {!document.dataUrl ? (
                <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
                  <FileWarning className="h-8 w-8" />
                  <p className="text-sm">No file was uploaded for this document.</p>
                </div>
              ) : document.mimeType?.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={document.dataUrl} alt={document.fileName ?? "Document"} className="max-h-[60vh] w-auto object-contain" />
              ) : document.mimeType === "application/pdf" ? (
                <iframe src={document.dataUrl} title={document.fileName ?? "Document"} className="w-full h-[60vh]" />
              ) : (
                <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
                  <FileWarning className="h-8 w-8" />
                  <p className="text-sm">Preview isn&apos;t available for this file type.</p>
                  <a href={document.dataUrl} download={document.fileName} className="text-xs text-primary underline underline-offset-2">
                    Download {document.fileName}
                  </a>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
