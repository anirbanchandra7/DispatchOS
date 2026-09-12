"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UploadCloud, FileCheck2 } from "lucide-react";
import { readFileAsDataUrl } from "@/lib/read-file";
import type { DocumentType } from "@/types";

export interface UploadDocumentInput {
  type: DocumentType;
  documentNumber?: string;
  expiryDate: string;
  fileName: string;
  mimeType: string;
  dataUrl: string;
}

export type UploadDocumentResult = { ok: true } | { ok: false; error: string };

export function UploadDocumentDialog({
  open,
  onOpenChange,
  title,
  description,
  docTypes,
  requireDocumentNumber,
  documentNumberLabel = "Document number",
  onUpload,
  onSaved,
  successMessage = "Document uploaded",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  docTypes: { value: DocumentType; label: string }[];
  requireDocumentNumber?: boolean;
  documentNumberLabel?: string;
  onUpload: (input: UploadDocumentInput) => Promise<UploadDocumentResult>;
  onSaved: () => void | Promise<void>;
  successMessage?: string;
}) {
  const [type, setType] = useState<DocumentType>(docTypes[0]?.value ?? "OTHER");
  const [documentNumber, setDocumentNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  function reset() {
    setType(docTypes[0]?.value ?? "OTHER");
    setDocumentNumber("");
    setExpiry("");
    setFile(null);
  }

  async function handleSave() {
    if (!file || !expiry) return;
    if (requireDocumentNumber && !documentNumber.trim()) return;
    setSaving(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const res = await onUpload({
        type,
        documentNumber: documentNumber.trim() || undefined,
        expiryDate: expiry,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        dataUrl,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(successMessage);
      onOpenChange(false);
      reset();
      await onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) reset(); onOpenChange(next); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="doc-type">Document type</Label>
            <Select value={type} onValueChange={(v) => setType((v as DocumentType) ?? docTypes[0]?.value)}>
              <SelectTrigger id="doc-type" className="w-full">
                <SelectValue>{(v: DocumentType | null) => docTypes.find((t) => t.value === v)?.label ?? "Select type…"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {docTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {requireDocumentNumber && (
            <div className="space-y-1.5">
              <Label htmlFor="doc-number">{documentNumberLabel}</Label>
              <Input id="doc-number" value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="doc-expiry">Expiry date</Label>
            <Input id="doc-expiry" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="doc-file">File</Label>
            <label
              htmlFor="doc-file"
              className="flex items-center gap-2 h-9 px-3 rounded-md border border-dashed text-sm text-muted-foreground cursor-pointer hover:bg-muted/50"
            >
              {file ? <FileCheck2 className="h-4 w-4 text-emerald-600 shrink-0" /> : <UploadCloud className="h-4 w-4 shrink-0" />}
              <span className="truncate">{file ? file.name : "Choose file…"}</span>
            </label>
            <input id="doc-file" type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !file || !expiry || (requireDocumentNumber && !documentNumber.trim())}>
            {saving ? "Uploading…" : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
