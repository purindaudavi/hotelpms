"use client";

import { type ChangeEvent, useState } from "react";
import { ImagePlus, Star, Trash2, Upload } from "lucide-react";
import {
  deletePropertyImage,
  getPropertyApiErrorMessage,
  setPrimaryPropertyImage,
  uploadPropertyImage
} from "@/app/lib/property-api";
import type { PropertyImageRecord } from "./property-types";

type PropertyImagesProps = {
  propertyId: string;
  propertyExists: boolean;
  images: PropertyImageRecord[];
  editing: boolean;
  loading: boolean;
  onRefresh: () => Promise<void>;
  setToast: (message: string) => void;
};

export function PropertyImages({
  propertyId,
  propertyExists,
  images,
  editing,
  loading,
  onRefresh,
  setToast
}: PropertyImagesProps) {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const logo = images.find((image) => image.imageType === "logo");
  const gallery = images
    .filter((image) => image.imageType === "gallery")
    .sort((left, right) => left.sortOrder - right.sortOrder);

  function chooseLogo(event: ChangeEvent<HTMLInputElement>) {
    setLogoFile(event.target.files?.[0] ?? null);
  }

  function chooseGallery(event: ChangeEvent<HTMLInputElement>) {
    setGalleryFiles(Array.from(event.target.files ?? []));
  }

  async function saveLogo() {
    if (!logoFile) return;
    await runChange(async () => {
      await uploadPropertyImage(propertyId, logoFile, {
        imageType: "logo",
        description: description.trim() || `${logoFile.name} hotel logo`
      });
      setLogoFile(null);
      setDescription("");
      setToast("Official hotel logo saved in MongoDB");
    });
  }

  async function saveGallery() {
    if (!galleryFiles.length) return;
    const uploadCount = galleryFiles.length;
    await runChange(async () => {
      for (const [index, file] of galleryFiles.entries()) {
        await uploadPropertyImage(propertyId, file, {
          imageType: "gallery",
          description: description.trim() || file.name,
          isPrimary: gallery.length === 0 && index === 0
        });
      }
      setGalleryFiles([]);
      setDescription("");
      setToast(`${uploadCount} property image${uploadCount === 1 ? "" : "s"} saved in MongoDB`);
    });
  }

  async function makePrimary(image: PropertyImageRecord) {
    await runChange(async () => {
      await setPrimaryPropertyImage(propertyId, image.id);
      setToast(`${image.fileName} is now the main gallery image`);
    });
  }

  async function remove(image: PropertyImageRecord) {
    if (!window.confirm(`Delete ${image.fileName}?`)) return;
    await runChange(async () => {
      await deletePropertyImage(propertyId, image.id);
      setToast(image.imageType === "logo" ? "Official hotel logo deleted" : "Property image deleted");
    });
  }

  async function runChange(change: () => Promise<void>) {
    if (!propertyExists) {
      setError("Save Property Info before uploading images.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await change();
      await onRefresh();
    } catch (requestError) {
      setError(getPropertyApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  const controlsDisabled = !editing || saving || loading || !propertyExists;

  return (
    <div className="space-y-8">
      {!propertyExists ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Save Property Info first. Images require an existing MongoDB property.
        </div>
      ) : null}
      {error ? (
        <div className="rounded-md border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <section className="grid gap-6 rounded-lg border border-line p-5 lg:grid-cols-2">
        <div>
          <h2 className="text-2xl font-semibold">Official Hotel Logo</h2>
          <p className="mt-2 text-sm text-slate-500">
            This logo is used in the sidebar, page header and browser tab. Replacing it updates those locations automatically.
          </p>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={chooseLogo}
            disabled={controlsDisabled}
            className="mt-5 block w-full rounded-md border border-line p-3 text-sm disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => void saveLogo()}
            disabled={controlsDisabled || !logoFile}
            className="mt-4 inline-flex h-11 items-center gap-2 rounded-md bg-ink px-5 text-sm font-semibold text-white disabled:opacity-40"
          >
            <Upload className="h-4 w-4" />
            {saving ? "Saving..." : logo ? "Replace Logo" : "Upload Logo"}
          </button>
        </div>
        <div className="rounded-lg border border-line bg-slate-50 p-4">
          {logo ? (
            <div>
              <img src={logo.url} alt={logo.altText || "Official hotel logo"} className="mx-auto h-52 w-full object-contain" />
              <div className="mt-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{logo.description || "Official hotel logo"}</p>
                  <p className="text-xs text-slate-500">{logo.fileName}</p>
                </div>
                <button type="button" disabled={controlsDisabled} onClick={() => void remove(logo)} aria-label="Delete official logo" className="grid h-10 w-10 place-items-center rounded-md bg-rose-500 text-white disabled:opacity-40">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="grid h-64 place-items-center text-sm text-slate-500">No official logo uploaded.</div>
          )}
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="mb-2 text-2xl font-semibold">Property Gallery</h2>
          <p className="text-sm text-slate-500">Upload up to 20 JPEG, PNG or WebP images. Each file can be up to 8 MB.</p>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={chooseGallery}
            disabled={controlsDisabled}
            className="mt-4 block w-full rounded-md border border-line p-3 text-sm disabled:opacity-50"
          />
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={controlsDisabled}
            placeholder="Description for the selected upload"
            className="focus-ring mt-4 min-h-24 w-full rounded-md border border-line p-3 disabled:bg-slate-50"
          />
          <button type="button" onClick={() => void saveGallery()} disabled={controlsDisabled || !galleryFiles.length} className="mt-4 inline-flex h-11 items-center gap-2 rounded-md bg-ink px-5 text-sm font-semibold text-white disabled:opacity-40">
            <ImagePlus className="h-4 w-4" />
            {saving ? "Uploading..." : "Upload Gallery Images"}
          </button>
          {!editing ? <p className="mt-3 text-sm text-slate-500">Select Edit above to manage images.</p> : null}
        </div>

        <div>
          <h2 className="mb-4 text-2xl font-semibold">Uploaded Images</h2>
          {loading ? <div className="rounded-md border border-line px-4 py-3 text-sm text-slate-500">Loading images from MongoDB...</div> : null}
          {!loading && gallery.length ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {gallery.map((image) => (
                <article key={image.id} className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
                  <img src={image.url} alt={image.altText || image.description || image.fileName} className="h-56 w-full object-cover" />
                  <div className="p-4">
                    <p className="font-semibold">{image.description || image.fileName}</p>
                    <p className="mt-1 text-xs text-slate-500">{image.fileName}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <button type="button" disabled={controlsDisabled || image.isPrimary} onClick={() => void makePrimary(image)} className="inline-flex h-9 items-center gap-2 rounded-md border border-line px-3 text-xs font-semibold disabled:opacity-50">
                        <Star className="h-4 w-4" />{image.isPrimary ? "Main image" : "Make main"}
                      </button>
                      <button type="button" disabled={controlsDisabled} onClick={() => void remove(image)} aria-label={`Delete ${image.fileName}`} className="grid h-9 w-9 place-items-center rounded-md bg-rose-500 text-white disabled:opacity-40">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
          {!loading && !gallery.length ? <div className="grid min-h-60 place-items-center rounded-lg border border-dashed border-line text-slate-500">No property gallery images uploaded yet.</div> : null}
        </div>
      </section>
    </div>
  );
}
