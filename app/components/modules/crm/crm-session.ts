export type CrmImageAsset = {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
};

export type CrmTemplate = {
  id: string;
  templateName: string;
  category: string;
  prompt: string;
  subject: string;
  body: string;
  promoCode: string;
  images: CrmImageAsset[];
  createdAt: string;
  updatedAt: string;
};

export type CrmCampaignLog = {
  id: string;
  sentAt: string;
  guestName: string;
  email: string;
  templateName: string;
  subject: string;
  status: "Successful" | "Failed";
  message: string;
};

export const CRM_TEMPLATE_CATEGORIES = ["promo", "birthday", "welcome", "reservation", "review", "payment"] as const;

export function crmTemplatesKey(propertyId: string) {
  return `staypilot:${propertyId}:crm:templates`;
}

export function crmCampaignLogsKey(propertyId: string) {
  return `staypilot:${propertyId}:crm:campaign-logs`;
}

export function buildCrmPromoCode(templateName: string) {
  const slug = templateName
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug ? slug.slice(0, 18) : "PROMO";
}

export function isPromoTemplate(template: CrmTemplate) {
  return template.category.trim().toLowerCase().includes("promo");
}

export function buildCrmTemplateBody({
  templateName,
  category,
  prompt,
  promoCode
}: {
  templateName: string;
  category: string;
  prompt: string;
  promoCode: string;
}) {
  const title = templateName.trim() || "HotelMate Promotion";
  const categoryLabel = category.trim() || "promo";
  const promptText = prompt.trim() || "Invite past guests to book their next stay with a clear promotional offer.";

  return [
    `Hi {{guestName}},`,
    "",
    `We created this ${categoryLabel} email for ${title}.`,
    promptText,
    "",
    `Use promo code ${promoCode} when booking your next stay at Ronaka Airport Transit Hotel.`,
    "We look forward to welcoming you again.",
    "",
    "Regards,",
    "Ronaka Airport Transit Hotel"
  ].join("\n");
}
