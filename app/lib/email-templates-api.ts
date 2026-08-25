import { api, getApiErrorMessage } from "./api";

export type EmailTemplateCategory = "confirmation" | "check-in" | "check-out" | "cancellation" | "reminder" | "no-show" | "general";
export type EmailTemplateBlockRecord = {
  id: string;
  kind: "header" | "reservation" | "custom" | "footer";
  title: string;
  content: string;
};
export type EmailTemplateRecord = {
  id: string;
  propertyId?: string;
  category: EmailTemplateCategory;
  name: string;
  subject: string;
  blocks: EmailTemplateBlockRecord[];
  active: boolean;
  updatedAt: string | null;
  builtIn?: boolean;
};

export type EmailTemplatePayload = Pick<EmailTemplateRecord, "category" | "name" | "subject" | "blocks">;

type TemplateCollectionResponse = {
  settings: { useDefaultTemplates: boolean };
  templates: EmailTemplateRecord[];
  defaults: EmailTemplateRecord[];
};

export async function getEmailTemplates(propertyId: string) {
  const response = await api.get<TemplateCollectionResponse>("/email-templates", {
    params: { property_id: propertyId }
  });
  return response.data;
}

export async function setUseDefaultEmailTemplates(propertyId: string, useDefaultTemplates: boolean) {
  const response = await api.patch<{ settings: { useDefaultTemplates: boolean } }>(
    "/email-templates/settings",
    { property_id: propertyId, useDefaultTemplates }
  );
  return response.data.settings;
}

export async function createEmailTemplate(propertyId: string, payload: EmailTemplatePayload) {
  const response = await api.post<{ template: EmailTemplateRecord }>("/email-templates", {
    property_id: propertyId,
    ...payload
  });
  return response.data.template;
}

export async function updateEmailTemplate(propertyId: string, templateId: string, payload: EmailTemplatePayload) {
  const response = await api.patch<{ template: EmailTemplateRecord }>(`/email-templates/${templateId}`, {
    property_id: propertyId,
    ...payload
  });
  return response.data.template;
}

export async function activateEmailTemplate(propertyId: string, templateId: string) {
  const response = await api.post<{ template: EmailTemplateRecord }>(`/email-templates/${templateId}/activate`, {
    property_id: propertyId
  });
  return response.data.template;
}

export function getEmailTemplatesApiErrorMessage(error: unknown) {
  return getApiErrorMessage(error, "Email templates could not be loaded.");
}
