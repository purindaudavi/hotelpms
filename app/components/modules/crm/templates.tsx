"use client";

import { type ChangeEvent, type FormEvent, useMemo, useState } from "react";
import { FileImage, ImagePlus, PlayCircle, Save, Trash2, UploadCloud } from "lucide-react";
import { useSessionState } from "@/app/components/hooks/use-session-state";
import {
  CRM_TEMPLATE_CATEGORIES,
  buildCrmPromoCode,
  buildCrmTemplateBody,
  crmTemplatesKey,
  type CrmImageAsset,
  type CrmTemplate
} from "@/app/components/modules/crm/crm-session";

type TemplatesPageProps = {
  propertyId: string;
  setToast: (message: string) => void;
};

type TemplateForm = {
  templateName: string;
  category: string;
  prompt: string;
  subject: string;
};

const emptyForm: TemplateForm = {
  templateName: "",
  category: "promo",
  prompt: "",
  subject: "HotelMate | Promo Campaign"
};

const maxImages = 5;
const maxImageSize = 5 * 1024 * 1024;

export function TemplatesPage({ propertyId, setToast }: TemplatesPageProps) {
  const [templates, setTemplates] = useSessionState<CrmTemplate[]>(crmTemplatesKey(propertyId), []);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [form, setForm] = useState<TemplateForm>(emptyForm);
  const [images, setImages] = useState<CrmImageAsset[]>([]);
  const [previewBody, setPreviewBody] = useState("");

  const selectedTemplate = useMemo(() => templates.find((template) => template.id === selectedTemplateId), [templates, selectedTemplateId]);
  const previewPromoCode = useMemo(() => buildCrmPromoCode(form.templateName), [form.templateName]);
  const previewText = previewBody || selectedTemplate?.body || "";

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;

    const availableSlots = maxImages - images.length;
    if (availableSlots <= 0) {
      setToast("Maximum 5 images allowed");
      return;
    }

    const accepted = files.slice(0, availableSlots).filter((file) => file.type.startsWith("image/") && file.size <= maxImageSize);
    if (accepted.length !== files.length) {
      setToast("Only image files up to 5MB are accepted");
    }

    const uploaded = await Promise.all(accepted.map(readImageFile));
    setImages((current) => [...current, ...uploaded].slice(0, maxImages));
    if (uploaded.length) setToast(`${uploaded.length} image${uploaded.length === 1 ? "" : "s"} uploaded`);
  }

  function generateTemplate(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const body = buildCrmTemplateBody({
      templateName: form.templateName,
      category: form.category,
      prompt: form.prompt,
      promoCode: previewPromoCode
    });
    setPreviewBody(body);
    setToast("Email body generated");
  }

  function saveTemplate() {
    if (!form.templateName.trim()) {
      setToast("Enter a template name");
      return;
    }
    if (!form.category.trim()) {
      setToast("Enter a category");
      return;
    }

    const now = new Date().toISOString();
    const template: CrmTemplate = {
      id: selectedTemplateId || `template-${Date.now()}`,
      templateName: form.templateName.trim(),
      category: form.category.trim(),
      prompt: form.prompt.trim(),
      subject: form.subject.trim() || "HotelMate | Promo Campaign",
      body:
        previewBody ||
        buildCrmTemplateBody({
          templateName: form.templateName,
          category: form.category,
          prompt: form.prompt,
          promoCode: previewPromoCode
        }),
      promoCode: previewPromoCode,
      images,
      createdAt: selectedTemplate?.createdAt || now,
      updatedAt: now
    };

    setTemplates((current) => {
      const exists = current.some((item) => item.id === template.id);
      if (exists) return current.map((item) => (item.id === template.id ? template : item));
      return [template, ...current];
    });
    setSelectedTemplateId(template.id);
    setPreviewBody(template.body);
    setToast(`${template.templateName} saved`);
  }

  function loadTemplate(template: CrmTemplate) {
    setSelectedTemplateId(template.id);
    setForm({
      templateName: template.templateName,
      category: template.category,
      prompt: template.prompt,
      subject: template.subject
    });
    setImages(template.images);
    setPreviewBody(template.body);
  }

  function editTemplate() {
    if (selectedTemplate) {
      loadTemplate(selectedTemplate);
      setToast(`${selectedTemplate.templateName} loaded`);
      return;
    }
    if (templates[0]) {
      loadTemplate(templates[0]);
      setToast(`${templates[0].templateName} loaded`);
      return;
    }
    setToast("Create a template first");
  }

  function deleteTemplate() {
    if (!selectedTemplateId) {
      setForm(emptyForm);
      setImages([]);
      setPreviewBody("");
      setToast("Template form cleared");
      return;
    }
    setTemplates((current) => current.filter((template) => template.id !== selectedTemplateId));
    setSelectedTemplateId("");
    setForm(emptyForm);
    setImages([]);
    setPreviewBody("");
    setToast("Template deleted");
  }

  return (
    <main className="space-y-6 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-3xl font-semibold">Email Templates</h2>
        <div className="flex items-center gap-3">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-cyan-100 text-slate-800">
            <PlayCircle className="h-5 w-5" />
          </div>
          <button
            type="button"
            onClick={editTemplate}
            className="inline-flex h-12 items-center rounded-md border border-line bg-slate-50 px-6 text-sm font-semibold hover:bg-white"
          >
            Edit Template
          </button>
          <button
            type="button"
            onClick={deleteTemplate}
            aria-label="Delete template"
            className="grid h-12 w-14 place-items-center rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      <section className="rounded-lg border border-line bg-white p-6 shadow-sm">
        <div className="grid gap-8 xl:grid-cols-[1fr_0.95fr]">
          <form onSubmit={generateTemplate} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Template Name">
                <input
                  value={form.templateName}
                  onChange={(event) => setForm((current) => ({ ...current, templateName: event.target.value }))}
                  className="focus-ring h-12 w-full rounded-md border border-line bg-white px-4 text-sm"
                />
              </Field>
              <Field label="Category">
                <input
                  list="crm-template-categories"
                  value={form.category}
                  onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                  className="focus-ring h-12 w-full rounded-md border border-line bg-white px-4 text-sm"
                />
                <datalist id="crm-template-categories">
                  {CRM_TEMPLATE_CATEGORIES.map((category) => (
                    <option key={category} value={category} />
                  ))}
                </datalist>
              </Field>
            </div>

            <Field label="Email Description or Prompt">
              <textarea
                value={form.prompt}
                onChange={(event) => setForm((current) => ({ ...current, prompt: event.target.value }))}
                placeholder="Describe the email template you want to create ..."
                className="focus-ring min-h-36 w-full rounded-md border border-line bg-white px-4 py-3 text-sm"
              />
            </Field>

            <div>
              <p className="mb-3 text-sm font-semibold text-slate-600">Upload Images (Optional) - Max 5 images</p>
              <label className="grid min-h-48 cursor-pointer place-items-center rounded-lg border border-dashed border-slate-300 bg-white px-4 py-8 text-center hover:bg-slate-50">
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                <span>
                  <UploadCloud className="mx-auto mb-4 h-12 w-12 text-slate-400" />
                  <span className="font-semibold text-blue-600">Click to upload</span>
                  <span className="text-slate-500"> or drag and drop</span>
                  <span className="mt-1 block text-sm text-slate-500">JPG, PNG, or WebP (max 5MB per image)</span>
                </span>
              </label>

              {images.length ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {images.map((image) => (
                    <div key={image.id} className="overflow-hidden rounded-lg border border-line bg-slate-50">
                      <img src={image.dataUrl} alt={image.name} className="h-28 w-full object-cover" />
                      <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                        <span className="truncate">{image.name}</span>
                        <button
                          type="button"
                          onClick={() => setImages((current) => current.filter((item) => item.id !== image.id))}
                          className="rounded p-1 text-slate-500 hover:bg-white hover:text-rose-600"
                          aria-label={`Remove ${image.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <button type="submit" className="inline-flex h-12 items-center rounded-md bg-blue-300 px-5 text-sm font-semibold text-white hover:bg-blue-400">
              Generate Template
            </button>

            {templates.length ? (
              <div className="rounded-lg border border-line bg-slate-50 p-4">
                <p className="mb-3 text-sm font-semibold text-slate-600">Saved Templates</p>
                <div className="flex flex-wrap gap-2">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => loadTemplate(template)}
                      className={`rounded-md border px-3 py-2 text-sm font-semibold ${
                        selectedTemplateId === template.id ? "border-ink bg-ink text-white" : "border-line bg-white text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {template.templateName}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex justify-end border-t border-line pt-5">
              <button type="button" onClick={saveTemplate} className="inline-flex h-12 items-center gap-2 rounded-md bg-ink px-8 text-sm font-semibold text-white hover:bg-slate-800">
                <Save className="h-4 w-4" />
                Save Template
              </button>
            </div>
          </form>

          <section className="min-h-[640px] rounded-lg border border-line bg-white">
            <div className="border-b border-line bg-slate-50 px-5 py-4">
              <h3 className="font-semibold">Preview</h3>
            </div>
            <div className="p-5">
              {previewText || images.length ? (
                <EmailPreview subject={form.subject} body={previewText} images={images} promoCode={previewPromoCode} />
              ) : (
                <p className="text-slate-500">No preview yet. Enter a prompt and click Generate Email Body.</p>
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function EmailPreview({ subject, body, images, promoCode }: { subject: string; body: string; images: CrmImageAsset[]; promoCode: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
      <div className="border-b border-line px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email Subject</p>
        <h4 className="mt-1 text-lg font-semibold">{subject || "HotelMate | Promo Campaign"}</h4>
      </div>
      {images.length ? (
        <div className="grid gap-2 p-4 sm:grid-cols-2">
          {images.map((image) => (
            <img key={image.id} src={image.dataUrl} alt={image.name} className="h-36 w-full rounded-md object-cover" />
          ))}
        </div>
      ) : (
        <div className="grid h-36 place-items-center bg-slate-50 text-slate-400">
          <div className="text-center">
            <FileImage className="mx-auto mb-2 h-8 w-8" />
            <p className="text-sm">Uploaded images will appear here</p>
          </div>
        </div>
      )}
      <div className="space-y-4 px-5 py-5 text-sm leading-6 text-slate-700">
        {(body || "").split("\n").map((line, index) => (
          <p key={`${line}-${index}`} className={line ? "" : "h-2"}>
            {line}
          </p>
        ))}
        <div className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white">
          <ImagePlus className="h-4 w-4" />
          {promoCode}
        </div>
      </div>
    </div>
  );
}

function readImageFile(file: File) {
  return new Promise<CrmImageAsset>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        id: `image-${Date.now()}-${file.name}`,
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl: String(reader.result)
      });
    };
    reader.onerror = () => reject(new Error("Unable to read image"));
    reader.readAsDataURL(file);
  });
}
