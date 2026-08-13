export type PropertyDetails = {
  hotelName: string; hotelType: string; hotelGuid: string; starCategory: string; numberOfRooms: string;
  onTrial: boolean; plan: string; description: string; address: string; city: string; zipCode: string;
  country: string; phone: string; email: string; website: string; checkInTime: string; checkOutTime: string;
  homeCurrency: string; languageCode: string; timezone: string; logoWidth: string; logoHeight: string; ibeLogoWidth: string;
  ibeLogoHeight: string; supportPin: string; invoiceFooter: string; invoiceNotes: string; createdOn: string;
  createdTimestamp: string; lastUpdatedOn: string; lastUpdatedTimestamp: string; lastUpdatedBy: string;
  cmPropertyId: string; cmActive: boolean; latitude: string; longitude: string; logoUrl: string;
};

export type PropertyImageRecord = {
  id: string;
  url: string;
  description: string;
  fileName: string;
  altText: string;
  imageType: "logo" | "gallery";
  isPrimary: boolean;
  sortOrder: number;
};
export type MealPlan = "Room Only" | "Bed & Breakfast" | "Half Board" | "Full Board" | "All Inclusive";
export type MealAmounts = { breakfast: number; lunch: number; dinner: number };
export type MealAllocation = {
  id: string;
  name: string;
  mealPlan: MealPlan;
  currency: string;
  adultAmounts: MealAmounts;
  childAmounts: MealAmounts;
  validFrom: string;
  validTo: string;
  active: boolean;
  notes: string;
  version: number;
};
export type GatewayName = "CyberSource" | "PayPal" | "Skrill" | "Stripe" | "Google Pay" | "Apple Pay";
export type GatewaySettings = {
  active: boolean; sandbox: boolean; bankName: string; ipgName: string; merchantIdUsd: string; profileIdUsd: string;
  accessKeyUsd: string; secretKeyUsd: string; merchantIdLkr: string; profileIdLkr: string; accessKeyLkr: string;
  secretKeyLkr: string; paypalMerchantId: string; paypalConnected: boolean;
};
export type CurrencyRecord = { id: string; code: string; name: string; symbol: string; hotelToCurrency: number; isDefault: boolean };
export type TaxRecord = { id: string; name: string; rate: number; inclusive: boolean; active: boolean };
export type ThemeMode = "light" | "dark" | "system";
export type ThemeSettings = { mode: ThemeMode; autoDetect: boolean; accent: string; statusColors: Record<string, string> };
