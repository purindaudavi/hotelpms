"use client";

import { type ChangeEvent, type Dispatch, type SetStateAction, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import type { PropertyImageRecord } from "./property-types";

export function PropertyImages({ images, setImages, editing, setToast }: { images: PropertyImageRecord[]; setImages: Dispatch<SetStateAction<PropertyImageRecord[]>>; editing: boolean; setToast: (message: string) => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [description, setDescription] = useState("");
  function choose(event: ChangeEvent<HTMLInputElement>) { setFiles(Array.from(event.target.files ?? [])); }
  function upload() {
    if (!files.length) return;
    setImages((current) => [...current, ...files.map((file, index) => ({ id: `property-image-${Date.now()}-${index}`, url: URL.createObjectURL(file), description: description.trim() || file.name, fileName: file.name }))]);
    setFiles([]); setDescription(""); setToast(`${files.length} property image${files.length === 1 ? "" : "s"} uploaded for this session`);
  }
  return <div className="grid gap-8 lg:grid-cols-2">
    <section><h2 className="mb-4 text-2xl font-semibold">Upload Property Image</h2>
      <input type="file" accept="image/*" multiple onChange={choose} disabled={!editing} className="block w-full rounded-md border border-line p-3 text-sm disabled:opacity-50" />
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={!editing} placeholder="Image description" className="focus-ring mt-4 min-h-24 w-full rounded-md border border-line p-3 disabled:bg-slate-50" />
      <button onClick={upload} disabled={!editing || !files.length} className="mt-4 inline-flex h-11 items-center gap-2 rounded-md bg-ink px-5 text-sm font-semibold text-white disabled:opacity-40"><ImagePlus className="h-4 w-4" />Upload Image</button>
      {!editing ? <p className="mt-3 text-sm text-slate-500">Select Edit above to upload or delete images.</p> : null}
    </section>
    <section><h2 className="mb-4 text-2xl font-semibold">Uploaded Images</h2>{images.length ? <div className="grid gap-4 sm:grid-cols-2">{images.map((image, index) => <article key={image.id} className="overflow-hidden rounded-lg border border-line bg-white shadow-sm"><img src={image.url} alt={image.description} className="h-56 w-full object-cover" /><div className="flex items-center justify-between gap-3 p-4"><div><p className="font-semibold">{image.description}</p><p className="mt-1 text-xs text-slate-500">{index === 0 ? "Main image" : image.fileName}</p></div><button disabled={!editing} onClick={() => setImages((current) => current.filter((item) => item.id !== image.id))} aria-label={`Delete ${image.description}`} className="grid h-10 w-10 place-items-center rounded-md bg-rose-500 text-white disabled:opacity-40"><Trash2 className="h-4 w-4" /></button></div></article>)}</div> : <div className="grid min-h-60 place-items-center rounded-lg border border-dashed border-line text-slate-500">No property images uploaded yet.</div>}</section>
  </div>;
}
