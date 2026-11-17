"use client";

import type { Tr } from "@/lib/i18n";
import { useT } from "@/components/lang-provider";
import { startTransition, useActionState, useEffect, useState } from "react";
import { addReceipt } from "@/app/actions/requests";
import { Dialog } from "@/components/dialog";
import { Icon } from "@/components/icons";
import { MAX_ISSUE_NOTE_LENGTH, MAX_RECEIPT_BYTES } from "@/lib/validation";

// Phone photos are several MB; a receipt stays readable at this size as a JPEG of a few hundred KB.
const MAX_SIDE = 1600;

async function shrink(file: File, t: Tr): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // A format this browser can't draw is sent as it is, if the server can take it.
    if (file.size <= MAX_RECEIPT_BYTES && /^image\/(jpeg|png|webp)$/.test(file.type)) return file;
    throw new Error(t("Picha hii haisomeki. Piga picha nyingine.", "This photo can't be read. Take another one."));
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  for (const quality of [0.8, 0.65, 0.5]) {
    const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, "image/jpeg", quality));
    if (blob && blob.size <= MAX_RECEIPT_BYTES) return blob;
  }
  throw new Error(t("Picha ni kubwa mno. Piga picha nyingine.", "The photo is too large. Take another one."));
}

// The "Weka risiti" button on a paid request and its dialog: pick or take a photo, check the
// preview, add the receipt number if there is one, save.
export function AddReceipt({ requestId, summary }: { requestId: number; summary: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(addReceipt, undefined);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  // Close the dialog once the receipt is saved (React's "adjust state on change" pattern).
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state?.ok) setOpen(false);
  }

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  async function pick(file: File | undefined) {
    setPhoto(null);
    setPreview(null);
    setError(null);
    if (!file) return;
    setReading(true);
    try {
      const blob = await shrink(file, t);
      setPhoto(blob);
      setPreview(URL.createObjectURL(blob));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Picha hii haisomeki.", "This photo can't be read."));
    } finally {
      setReading(false);
    }
  }

  function save(formData: FormData) {
    if (!photo) return;
    formData.set("receipt", photo, "risiti.jpg");
    startTransition(() => action(formData));
  }

  const message = error ?? (state && !state.ok ? state.message : null);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          void pick(undefined);
          setOpen(true);
        }}
        className="btn btn-primary gap-2"
      >
        <Icon name="receipt" className="size-4" />
        {t("Weka risiti", "Add receipt")}
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} title={t("Weka risiti", "Add receipt")} description={summary}>
        <form action={save} className="grid gap-4">
          <input type="hidden" name="id" value={requestId} />
          {/* The browser's own file button speaks English, so the whole box is the button instead. */}
          <label className="block">
            <span className="label">{t("Picha ya risiti", "Receipt photo")}</span>
            <span className="grid cursor-pointer place-items-center gap-2 rounded-lg border border-dashed border-line p-3 text-sm font-medium text-accent hover:bg-accent-soft focus-within:ring-2">
              <input type="file" accept="image/*" onChange={(e) => pick(e.target.files?.[0])} className="sr-only" />
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element -- a local blob preview, nothing to optimise
                <img src={preview} alt={t("Risiti uliyochagua", "The receipt you picked")} className="max-h-64 w-full rounded object-contain" />
              ) : (
                <Icon name="receipt" className="size-8" />
              )}
              {reading ? t("Inaandaa picha…", "Preparing the photo…") : preview ? t("Badilisha picha", "Change photo") : t("Piga picha au chagua iliyopo", "Take a photo or pick one")}
            </span>
          </label>
          <label className="block">
            <span className="label">{t("Namba ya risiti (si lazima)", "Receipt number (optional)")}</span>
            <input name="note" maxLength={MAX_ISSUE_NOTE_LENGTH} autoComplete="off" className="input" />
          </label>
          {message && <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{message}</p>}
          <button type="submit" disabled={!photo || pending} className="btn btn-primary">
            {pending ? t("Inahifadhi…", "Saving…") : t("Hifadhi risiti", "Save receipt")}
          </button>
        </form>
      </Dialog>
    </>
  );
}
