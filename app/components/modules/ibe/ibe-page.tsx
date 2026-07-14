"use client";

import { ChangeEvent, FormEvent, PointerEvent as ReactPointerEvent, useMemo, useState } from "react";
import { CalendarDays, Check, ChevronLeft, ChevronRight, ImageIcon, Package, Plus, Save, Star, UploadCloud, X } from "lucide-react";
import { property, roomTypes } from "@/app/data/pms-data";
import { useSessionState } from "@/app/components/hooks/use-session-state";

type IbeTab = "Hotel Details" | "IBE Config" | "IBE Policies" | "Packages" | "Min Stay" | "IBE Rate" | "Promo Code" | "Smart Pricing";

type IbeHotelDetails = {
  hotelName: string;
  city: string;
  address: string;
  country: string;
  phone: string;
  email: string;
  hotelType: string;
  starCategory: number;
  numberOfRooms: number;
  currencyCode: string;
};

type IbeConfig = {
  headerColour: string;
  ibeActive: boolean;
  allowPay50: boolean;
  payAtProperty: boolean;
  allowPayLater: boolean;
  payLaterDays: number;
  childFriendly: boolean;
  childAgeMin: number;
  childAgeMax: number;
};

type IbePolicies = {
  cancellationPolicy: string;
  childPolicy: string;
  taxPolicy: string;
};

type IbePackage = {
  id: string;
  code: string;
  type: string;
  description: string;
  price: number;
  currency: string;
  duration: number;
  minStay: number;
  salesGlAccount: string;
  imageUrl: string;
};

type IbeRateCurrency = "LKR" | "USD";
type IbeRateMode = "SET" | "+" | "-" | "%";

type IbeRateRoom = {
  roomType: string;
  availability: number;
  availabilityOverrides?: Record<string, number>;
  lkrRate: number;
  usdRate: number;
  occupancies: number[];
};

type IbeRateOverride = {
  id: string;
  roomType: string;
  plan: string;
  currency: IbeRateCurrency;
  occupancy: number;
  startDate: string;
  endDate: string;
  mode: IbeRateMode;
  value: number;
  finalValue: number;
};

type IbeRateDrawerState = {
  roomType: string;
  plan: string;
  currency: IbeRateCurrency;
  occupancy: number;
  date: string;
  startDate: string;
  endDate: string;
  days: number;
  currentPrice: number;
  mode: IbeRateMode;
  value: number;
};

type IbePromoCode = {
  id: string;
  code: string;
  promoType: string;
  description: string;
  applyFor: string;
  percentage: number;
  bookingStartDate: string;
  bookingEndDate: string;
  stayStartDate: string;
  stayEndDate: string;
  active: boolean;
  showOnIbe: boolean;
};

type PromoCodeViewMode = "grid" | "table";

type SmartPricingSettings = {
  enabled: boolean;
  baseAdjustmentPercent: number;
  weekendAdjustmentPercent: number;
  highOccupancyThreshold: number;
  highOccupancyAdjustmentPercent: number;
  lowOccupancyThreshold: number;
  lowOccupancyDiscountPercent: number;
  minRateGuard: number;
  maxRateGuard: number;
};

type IbeSettings = {
  activeTab: IbeTab;
  hotel: IbeHotelDetails;
  config: IbeConfig;
  policies: IbePolicies;
  packages: IbePackage[];
  minStayRules: Record<string, number>;
  ibeRateOverrides: IbeRateOverride[];
  promoCodes: IbePromoCode[];
  smartPricing: SmartPricingSettings;
  ibeHomeImage: string;
  logoImage: string;
  logoWidth: number;
  logoHeight: number;
  bannerOffsetX: number;
  bannerOffsetY: number;
  bannerScale: number;
};

type IbePageProps = {
  propertyId: string;
  setToast: (message: string) => void;
};

type MinStayDrawerState = {
  mode: "create" | "edit";
  roomType: string;
  startDate: string;
  endDate: string;
  nights: number;
};

const tabs: IbeTab[] = ["Hotel Details", "IBE Config", "IBE Policies", "Packages", "Min Stay", "IBE Rate", "Promo Code", "Smart Pricing"];

const defaultBannerGradient =
  roomTypes[0]?.imageGradient ?? "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 35%, #15803d 36%, #22c55e 48%, #78350f 100%)";

const ibeRateRooms: IbeRateRoom[] = [
  { roomType: "Deluxe Double Room", availability: 7, availabilityOverrides: { "2026-06-20": 6 }, lkrRate: 6500, usdRate: 20, occupancies: [1, 2] },
  { roomType: "Deluxe Twin Room", availability: 2, lkrRate: 7500, usdRate: 22, occupancies: [1, 2] },
  { roomType: "Deluxe Triple Room", availability: 3, lkrRate: 8500, usdRate: 26, occupancies: [1, 2, 3] },
  { roomType: "Deluxe Family Room", availability: 2, lkrRate: 9500, usdRate: 29, occupancies: [1, 2, 3, 4] }
];

const ibeRateGridDayOptions = [7, 14, 21, 30];
const promoTypeOptions = ["Percentage", "Fixed Amount"];
const promoApplyForOptions = ["Resident", "Non-Resident", "All Guests", "Direct Booking", "Packages"];

export function IbePage({ propertyId, setToast }: IbePageProps) {
  const [settings, setSettings] = useSessionState<IbeSettings>(`staypilot:${propertyId}:ibe:settings`, makeInitialSettings);
  const currentSettings = normalizeIbeSettings(settings);
  const [pendingBannerImage, setPendingBannerImage] = useState("");
  const [pendingLogoImage, setPendingLogoImage] = useState("");
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [isCompressingBanner, setIsCompressingBanner] = useState(false);
  const [packageDrawerOpen, setPackageDrawerOpen] = useState(false);
  const [minStayStartDate, setMinStayStartDate] = useState("2026-06-16");
  const [minStayDrawer, setMinStayDrawer] = useState<MinStayDrawerState | null>(null);
  const [ibeRateStartDate, setIbeRateStartDate] = useState("2026-06-16");
  const [ibeRateGridDays, setIbeRateGridDays] = useState(14);
  const [ibeRateDrawer, setIbeRateDrawer] = useState<IbeRateDrawerState | null>(null);
  const [promoCodeDrawerOpen, setPromoCodeDrawerOpen] = useState(false);
  const [promoCodeViewMode, setPromoCodeViewMode] = useState<PromoCodeViewMode>("grid");

  const previewBanner = pendingBannerImage || currentSettings.ibeHomeImage;
  const previewColour = isHexColour(currentSettings.config.headerColour) ? currentSettings.config.headerColour : "#000000";

  function updateHotel<K extends keyof IbeHotelDetails>(key: K, value: IbeHotelDetails[K]) {
    setSettings((current) => {
      const safe = normalizeIbeSettings(current);
      return {
        ...safe,
        hotel: {
          ...safe.hotel,
          [key]: value
        }
      };
    });
  }

  function updateConfig<K extends keyof IbeConfig>(key: K, value: IbeConfig[K]) {
    setSettings((current) => {
      const safe = normalizeIbeSettings(current);
      return {
        ...safe,
        config: {
          ...safe.config,
          [key]: value
        }
      };
    });
  }

  function updatePolicy<K extends keyof IbePolicies>(key: K, value: IbePolicies[K]) {
    setSettings((current) => {
      const safe = normalizeIbeSettings(current);
      return {
        ...safe,
        policies: {
          ...safe.policies,
          [key]: value
        }
      };
    });
  }

  function savePackage(nextPackage: IbePackage) {
    setSettings((current) => {
      const safe = normalizeIbeSettings(current);
      return {
        ...safe,
        packages: [...safe.packages, nextPackage]
      };
    });
    setPackageDrawerOpen(false);
    setToast("Package created for this session");
  }

  function removePackage(packageId: string) {
    setSettings((current) => {
      const safe = normalizeIbeSettings(current);
      return {
        ...safe,
        packages: safe.packages.filter((item) => item.id !== packageId)
      };
    });
    setToast("Package removed from this session");
  }

  function openCreateMinStay() {
    setMinStayDrawer({
      mode: "create",
      roomType: "",
      startDate: minStayStartDate,
      endDate: addDays(minStayStartDate, 13),
      nights: 0
    });
  }

  function openEditMinStay(roomType: string, date: string) {
    setMinStayDrawer({
      mode: "edit",
      roomType,
      startDate: date,
      endDate: date,
      nights: getMinStayValue(currentSettings, roomType, date)
    });
  }

  function saveMinStayRange(draft: MinStayDrawerState) {
    const dates = datesInRange(draft.startDate, draft.endDate);
    const nights = Math.max(1, Math.round(draft.nights));
    if (!draft.roomType || dates.length === 0 || !Number.isFinite(nights)) {
      setToast("Select a room type, date range, and minimum stay");
      return;
    }

    setSettings((current) => {
      const safe = normalizeIbeSettings(current);
      const nextRules = { ...safe.minStayRules };
      for (const date of dates) {
        nextRules[makeMinStayKey(draft.roomType, date)] = nights;
      }
      return {
        ...safe,
        minStayRules: nextRules
      };
    });
    setMinStayDrawer(null);
    setToast(draft.mode === "create" ? "Min stay rules created" : "Min stay rules updated");
  }

  function clearMinStayRange(draft: MinStayDrawerState) {
    const dates = datesInRange(draft.startDate, draft.endDate);
    setSettings((current) => {
      const safe = normalizeIbeSettings(current);
      const nextRules = { ...safe.minStayRules };
      for (const date of dates) {
        delete nextRules[makeMinStayKey(draft.roomType, date)];
      }
      return {
        ...safe,
        minStayRules: nextRules
      };
    });
    setMinStayDrawer(null);
    setToast("Min stay range cleared");
  }

  function openIbeRateOverride(roomType: string, plan: string, currency: IbeRateCurrency, occupancy: number, date: string, currentPrice: number) {
    setIbeRateDrawer({
      roomType,
      plan,
      currency,
      occupancy,
      date,
      startDate: date,
      endDate: date,
      days: 1,
      currentPrice,
      mode: "SET",
      value: currentPrice
    });
  }

  function saveIbeRateOverride(draft: IbeRateDrawerState) {
    const dates = datesInRange(draft.startDate, draft.endDate);
    if (dates.length === 0 || !Number.isFinite(draft.value)) {
      setToast("Choose a valid date range and value");
      return;
    }

    const finalValue = calculateIbeRateFinalValue(draft.currentPrice, draft.mode, draft.value, draft.currency);
    const selectedDates = new Set(dates);

    setSettings((current) => {
      const safe = normalizeIbeSettings(current);
      const nextOverrides = safe.ibeRateOverrides.filter((item) => {
        const sameTarget =
          item.roomType === draft.roomType && item.plan === draft.plan && item.currency === draft.currency && item.occupancy === draft.occupancy;
        if (!sameTarget) return true;
        return !datesInRange(item.startDate, item.endDate).some((date) => selectedDates.has(date));
      });

      return {
        ...safe,
        ibeRateOverrides: [
          ...nextOverrides,
          {
            id: `rate-${Date.now()}`,
            roomType: draft.roomType,
            plan: draft.plan,
            currency: draft.currency,
            occupancy: draft.occupancy,
            startDate: draft.startDate,
            endDate: draft.endDate,
            mode: draft.mode,
            value: draft.value,
            finalValue
          }
        ]
      };
    });
    setIbeRateDrawer(null);
    setToast("IBE rate override saved for this session");
  }

  function savePromoCode(nextPromoCode: IbePromoCode) {
    setSettings((current) => {
      const safe = normalizeIbeSettings(current);
      return {
        ...safe,
        promoCodes: [...safe.promoCodes, nextPromoCode]
      };
    });
    setPromoCodeDrawerOpen(false);
    setToast("Promo code created for this session");
  }

  function removePromoCode(promoCodeId: string) {
    setSettings((current) => {
      const safe = normalizeIbeSettings(current);
      return {
        ...safe,
        promoCodes: safe.promoCodes.filter((item) => item.id !== promoCodeId)
      };
    });
    setToast("Promo code removed");
  }

  function togglePromoCodeActive(promoCodeId: string) {
    setSettings((current) => {
      const safe = normalizeIbeSettings(current);
      return {
        ...safe,
        promoCodes: safe.promoCodes.map((item) => (item.id === promoCodeId ? { ...item, active: !item.active } : item))
      };
    });
  }

  function updateSmartPricing<K extends keyof SmartPricingSettings>(key: K, value: SmartPricingSettings[K]) {
    setSettings((current) => {
      const safe = normalizeIbeSettings(current);
      return {
        ...safe,
        smartPricing: {
          ...safe.smartPricing,
          [key]: value
        }
      };
    });
  }

  async function chooseBanner(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setToast("Choose an image file for the IBE home banner");
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);
    setPendingBannerImage(dataUrl);
    setToast("Banner loaded. Drag inside the frame, then apply it.");
    event.target.value = "";
  }

  async function applyBanner() {
    const source = pendingBannerImage || currentSettings.ibeHomeImage;
    if (!source) {
      setToast("Choose a banner image first");
      return;
    }

    setIsCompressingBanner(true);
    try {
      const compressed = await compressImageSource(source, 980, 380, 100 * 1024);
      setSettings((current) => ({
        ...normalizeIbeSettings(current),
        ibeHomeImage: compressed
      }));
      setPendingBannerImage("");
      setToast("IBE home banner saved as ibeHomeImage");
    } catch {
      setToast("Could not process that banner image");
    } finally {
      setIsCompressingBanner(false);
    }
  }

  async function chooseLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setToast("Choose an image file for the logo");
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);
    setPendingLogoImage(dataUrl);
    setToast("Logo selected. Click Upload to use it in this session.");
    event.target.value = "";
  }

  function uploadLogo() {
    if (!pendingLogoImage) {
      setToast("Choose a logo image first");
      return;
    }
    setSettings((current) => ({
      ...normalizeIbeSettings(current),
      logoImage: pendingLogoImage
    }));
    setPendingLogoImage("");
    setToast("Logo uploaded for this session");
  }

  function handleBannerPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!previewBanner) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragStart({ x: event.clientX, y: event.clientY });
  }

  function handleBannerPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragStart) return;
    const deltaX = event.clientX - dragStart.x;
    const deltaY = event.clientY - dragStart.y;
    setDragStart({ x: event.clientX, y: event.clientY });
    setSettings((current) => {
      const safe = normalizeIbeSettings(current);
      return {
        ...safe,
        bannerOffsetX: clamp(safe.bannerOffsetX + deltaX, -160, 160),
        bannerOffsetY: clamp(safe.bannerOffsetY + deltaY, -100, 100)
      };
    });
  }

  function handleBannerPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragStart) event.currentTarget.releasePointerCapture(event.pointerId);
    setDragStart(null);
  }

  return (
    <main className="space-y-4 p-4 lg:p-6">
      <h1 className="text-2xl font-semibold text-ink">IBE Settings</h1>

      <div className="overflow-x-auto rounded-lg bg-slate-100 p-1">
        <div className="grid min-w-[980px] grid-cols-8 gap-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setSettings((current) => ({ ...normalizeIbeSettings(current), activeTab: tab }))}
              className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                currentSettings.activeTab === tab ? "bg-white text-ink shadow-sm" : "text-slate-500 hover:text-ink"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {currentSettings.activeTab === "Hotel Details" ? (
        <HotelDetailsTab settings={currentSettings} updateHotel={updateHotel} setToast={setToast} />
      ) : currentSettings.activeTab === "IBE Config" ? (
        <IbeConfigTab
          settings={currentSettings}
          previewBanner={previewBanner}
          previewColour={previewColour}
          pendingLogoImage={pendingLogoImage}
          updateConfig={updateConfig}
          setSettings={setSettings}
          chooseBanner={chooseBanner}
          applyBanner={applyBanner}
          chooseLogo={chooseLogo}
          uploadLogo={uploadLogo}
          handleBannerPointerDown={handleBannerPointerDown}
          handleBannerPointerMove={handleBannerPointerMove}
          handleBannerPointerUp={handleBannerPointerUp}
          isCompressingBanner={isCompressingBanner}
          setToast={setToast}
        />
      ) : currentSettings.activeTab === "IBE Policies" ? (
        <IbePoliciesTab settings={currentSettings} updatePolicy={updatePolicy} setToast={setToast} />
      ) : currentSettings.activeTab === "Packages" ? (
        <PackagesTab packages={currentSettings.packages} onAdd={() => setPackageDrawerOpen(true)} onRemove={removePackage} />
      ) : currentSettings.activeTab === "Min Stay" ? (
        <MinStayTab
          settings={currentSettings}
          startDate={minStayStartDate}
          onStartDateChange={setMinStayStartDate}
          onCreate={openCreateMinStay}
          onEdit={openEditMinStay}
        />
      ) : currentSettings.activeTab === "IBE Rate" ? (
        <IbeRateTab
          settings={currentSettings}
          startDate={ibeRateStartDate}
          gridDays={ibeRateGridDays}
          onStartDateChange={setIbeRateStartDate}
          onGridDaysChange={setIbeRateGridDays}
          onOverride={openIbeRateOverride}
        />
      ) : currentSettings.activeTab === "Promo Code" ? (
        <PromoCodeTab
          promoCodes={currentSettings.promoCodes}
          viewMode={promoCodeViewMode}
          onViewModeChange={setPromoCodeViewMode}
          onAdd={() => setPromoCodeDrawerOpen(true)}
          onRemove={removePromoCode}
          onToggleActive={togglePromoCodeActive}
        />
      ) : currentSettings.activeTab === "Smart Pricing" ? (
        <SmartPricingTab settings={currentSettings.smartPricing} updateSmartPricing={updateSmartPricing} setToast={setToast} />
      ) : (
        <PlaceholderTab tab={currentSettings.activeTab} />
      )}

      {packageDrawerOpen ? <CreatePackageDrawer onClose={() => setPackageDrawerOpen(false)} onSave={savePackage} /> : null}
      {minStayDrawer ? (
        <MinStayDrawer draft={minStayDrawer} setDraft={setMinStayDrawer} onClose={() => setMinStayDrawer(null)} onSave={saveMinStayRange} onClear={clearMinStayRange} />
      ) : null}
      {ibeRateDrawer ? (
        <IbeRateOverrideDialog draft={ibeRateDrawer} setDraft={setIbeRateDrawer} onClose={() => setIbeRateDrawer(null)} onSave={saveIbeRateOverride} />
      ) : null}
      {promoCodeDrawerOpen ? <CreatePromoCodeDrawer onClose={() => setPromoCodeDrawerOpen(false)} onSave={savePromoCode} /> : null}
    </main>
  );
}

// Hotel Details tab
function HotelDetailsTab({
  settings,
  updateHotel,
  setToast
}: {
  settings: IbeSettings;
  updateHotel: <K extends keyof IbeHotelDetails>(key: K, value: IbeHotelDetails[K]) => void;
  setToast: (message: string) => void;
}) {
  const hotel = settings.hotel;

  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <h2 className="mb-6 text-2xl font-semibold">IBE Hotel Information</h2>
      <div className="grid gap-5 md:grid-cols-2">
        <TextField label="Hotel Name" value={hotel.hotelName} onChange={(value) => updateHotel("hotelName", value)} muted />
        <TextField label="City" value={hotel.city} onChange={(value) => updateHotel("city", value)} muted />
        <TextField label="Address" value={hotel.address} onChange={(value) => updateHotel("address", value)} muted />
        <TextField label="Country" value={hotel.country} onChange={(value) => updateHotel("country", value)} muted />
        <TextField label="Phone" value={hotel.phone} onChange={(value) => updateHotel("phone", value)} muted />
        <TextField label="Email" value={hotel.email} onChange={(value) => updateHotel("email", value)} muted />
      </div>

      <div className="my-7 border-t border-line" />

      <h3 className="mb-6 text-xl font-semibold">General Hotel Information</h3>
      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-8">
          <InlineInfo label="Hotel Type" value={hotel.hotelType} />
          <InlineInfo label="Number of Rooms" value={String(hotel.numberOfRooms)} />
        </div>
        <div className="space-y-8">
          <div>
            <p className="mb-3 text-sm font-semibold text-slate-500">Star Category</p>
            <div className="flex flex-wrap items-center gap-2">
              {Array.from({ length: 5 }, (_, index) => {
                const value = index + 1;
                const selected = value <= hotel.starCategory;
                return (
                  <button key={value} type="button" onClick={() => updateHotel("starCategory", value)} aria-label={`${value} star`}>
                    <Star className={`h-9 w-9 ${selected ? "fill-amber-400 text-amber-400" : "fill-slate-100 text-slate-300"}`} />
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="text-sm text-slate-500">Selected: {hotel.starCategory} stars</span>
              <button
                type="button"
                onClick={() => setToast("IBE hotel star category saved")}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-white px-4 text-sm font-semibold shadow-sm hover:bg-slate-50"
              >
                <Check className="h-4 w-4" />
                Save
              </button>
            </div>
          </div>
          <InlineInfo label="Currency Code" value={hotel.currencyCode} />
        </div>
      </div>
    </section>
  );
}

// IBE Config tab
function IbeConfigTab({
  settings,
  previewBanner,
  previewColour,
  pendingLogoImage,
  updateConfig,
  setSettings,
  chooseBanner,
  applyBanner,
  chooseLogo,
  uploadLogo,
  handleBannerPointerDown,
  handleBannerPointerMove,
  handleBannerPointerUp,
  isCompressingBanner,
  setToast
}: {
  settings: IbeSettings;
  previewBanner: string;
  previewColour: string;
  pendingLogoImage: string;
  updateConfig: <K extends keyof IbeConfig>(key: K, value: IbeConfig[K]) => void;
  setSettings: React.Dispatch<React.SetStateAction<IbeSettings>>;
  chooseBanner: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  applyBanner: () => Promise<void>;
  chooseLogo: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  uploadLogo: () => void;
  handleBannerPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  handleBannerPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  handleBannerPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
  isCompressingBanner: boolean;
  setToast: (message: string) => void;
}) {
  const logoSource = pendingLogoImage || settings.logoImage;

  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <div className="grid gap-7 xl:grid-cols-[1.45fr_1fr]">
        <div className="space-y-7">
          <div>
            <h2 className="mb-7 text-2xl font-semibold">IBE Configuration</h2>
            <label className="mb-3 block text-sm font-semibold text-slate-500">Header Colour</label>
            <div className="flex flex-wrap items-center gap-4">
              <input
                type="color"
                value={previewColour}
                onChange={(event) => updateConfig("headerColour", event.target.value)}
                className="h-20 w-20 rounded-lg border border-line bg-white p-1 shadow-sm"
              />
              <input
                value={settings.config.headerColour}
                onChange={(event) => updateConfig("headerColour", event.target.value)}
                className="focus-ring h-12 min-w-64 flex-1 rounded-md border border-line px-4 text-sm"
              />
              <button
                type="button"
                onClick={() => setToast("IBE header colour saved")}
                className="inline-flex h-12 items-center gap-2 rounded-md bg-ink px-6 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
              >
                <Check className="h-4 w-4" />
                Save
              </button>
            </div>
          </div>

          <div className="border-t border-line" />

          <div className="rounded-lg border border-line p-5">
            <h3 className="text-lg font-semibold">IBE Booking Settings</h3>
            <p className="mt-1 text-sm text-slate-500">Configure payment rules and child policy constraints for online bookings.</p>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-line bg-slate-50 p-4">
                <CheckRow label="IBE Active" checked={settings.config.ibeActive} onChange={(checked) => updateConfig("ibeActive", checked)} />
                <CheckRow label="Allow Pay 50%" checked={settings.config.allowPay50} onChange={(checked) => updateConfig("allowPay50", checked)} />
                <CheckRow label="Pay at the Property" checked={settings.config.payAtProperty} onChange={(checked) => updateConfig("payAtProperty", checked)} />
                <CheckRow label="Allow Pay Later" checked={settings.config.allowPayLater} onChange={(checked) => updateConfig("allowPayLater", checked)} />
                <NumberField label="Pay Later Days" value={settings.config.payLaterDays} onChange={(value) => updateConfig("payLaterDays", value)} />
              </div>
              <div className="rounded-lg border border-line bg-slate-50 p-4">
                <CheckRow label="Child Friendly" checked={settings.config.childFriendly} onChange={(checked) => updateConfig("childFriendly", checked)} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <NumberField label="Child Age Min" value={settings.config.childAgeMin} onChange={(value) => updateConfig("childAgeMin", value)} />
                  <NumberField label="Child Age Max" value={settings.config.childAgeMax} onChange={(value) => updateConfig("childAgeMax", value)} />
                </div>
                <p className="mt-3 text-sm text-slate-500">Ensure max age is greater than or equal to min age.</p>
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setToast("IBE booking settings saved")}
                className="inline-flex h-12 items-center gap-2 rounded-md bg-ink px-6 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
              >
                <Check className="h-4 w-4" />
                Save Settings
              </button>
            </div>
          </div>

          <div className="border-t border-line" />

          <div className="grid gap-5 xl:grid-cols-[1fr_0.95fr]">
            <div>
              <div className="mb-4 grid gap-4 md:grid-cols-[1fr_0.95fr]">
                <h3 className="text-base font-semibold text-slate-600">IBE home banner</h3>
                <p className="text-sm text-slate-500">
                  Drag the photo inside the fixed frame to choose the banner, then apply. Compressed to under 100 KB and saved as ibeHomeImage.
                </p>
              </div>
              <div
                className={`relative h-56 overflow-hidden rounded-lg border border-line bg-slate-100 ${previewBanner ? "cursor-grab active:cursor-grabbing" : ""}`}
                onPointerDown={handleBannerPointerDown}
                onPointerMove={handleBannerPointerMove}
                onPointerUp={handleBannerPointerUp}
                onPointerCancel={handleBannerPointerUp}
              >
                {previewBanner ? (
                  <img
                    src={previewBanner}
                    alt="IBE home banner"
                    draggable={false}
                    className="absolute left-1/2 top-1/2 h-full w-full max-w-none select-none object-cover"
                    style={{
                      transform: `translate(calc(-50% + ${settings.bannerOffsetX}px), calc(-50% + ${settings.bannerOffsetY}px)) scale(${settings.bannerScale})`
                    }}
                  />
                ) : (
                  <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: defaultBannerGradient }} />
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <input type="file" accept="image/*" onChange={chooseBanner} className="block flex-1 rounded-md border border-line px-3 py-2 text-sm" />
                <label className="flex min-w-48 items-center gap-2 text-sm text-slate-500">
                  Scale
                  <input
                    type="range"
                    min="1"
                    max="1.8"
                    step="0.05"
                    value={settings.bannerScale}
                    onChange={(event) => setSettings((current) => ({ ...current, bannerScale: Number(event.target.value) }))}
                    className="w-28"
                  />
                </label>
                <button
                  type="button"
                  onClick={applyBanner}
                  disabled={isCompressingBanner}
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  <Save className="h-4 w-4" />
                  {isCompressingBanner ? "Applying..." : "Apply Banner"}
                </button>
              </div>
            </div>

            <div className="xl:hidden">
              <LogoTools settings={settings} logoSource={logoSource} pendingLogoImage={pendingLogoImage} setSettings={setSettings} chooseLogo={chooseLogo} uploadLogo={uploadLogo} setToast={setToast} />
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <LivePreview settings={settings} previewBanner={previewBanner} previewColour={previewColour} logoSource={logoSource} />
          <LogoTools settings={settings} logoSource={logoSource} pendingLogoImage={pendingLogoImage} setSettings={setSettings} chooseLogo={chooseLogo} uploadLogo={uploadLogo} setToast={setToast} className="hidden xl:block" />
        </div>
      </div>
    </section>
  );
}

function LivePreview({
  settings,
  previewBanner,
  previewColour,
  logoSource
}: {
  settings: IbeSettings;
  previewBanner: string;
  previewColour: string;
  logoSource: string;
}) {
  const previewStyle = useMemo(
    () => ({
      backgroundColor: previewColour,
      backgroundImage: previewBanner ? `url(${previewBanner})` : defaultBannerGradient
    }),
    [previewBanner, previewColour]
  );

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-slate-500">Live Preview</h3>
      <section className="overflow-hidden rounded-lg bg-cover bg-center text-white shadow-sm" style={previewStyle}>
        <div className="relative min-h-80 p-6">
          <div className="absolute inset-0 bg-black/35" />
          <div className="relative z-10">
            <div className="flex items-start justify-between gap-4">
              <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-full bg-black/75 ring-2 ring-white/70">
                {logoSource ? <img src={logoSource} alt="Hotel logo" className="h-full w-full object-contain" /> : <span className="text-sm font-bold text-amber-400">R</span>}
              </div>
              <div className="flex gap-2">
                <span className="rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-ink">EN</span>
                <span className="rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-ink">$ USD</span>
              </div>
            </div>
            <div className="mt-20 flex gap-2">
              <span className="rounded-full bg-black/35 px-3 py-1 text-xs font-semibold uppercase">Hotel</span>
              <span className="rounded-full bg-black/35 px-3 py-1 text-xs font-semibold uppercase">Luxury</span>
            </div>
            <h2 className="mt-3 text-3xl font-bold leading-tight lg:text-4xl">{settings.hotel.hotelName}</h2>
            <p className="mt-2 text-sm font-semibold">
              <span aria-hidden="true">&bull;</span> {settings.hotel.city}, {settings.hotel.country}
            </p>
            <div className="mt-7 grid gap-3 rounded-2xl bg-white/95 p-4 text-ink md:grid-cols-[1fr_1fr_1.1fr_1.1fr_auto]">
              <PreviewItem label="Dates" value="Add dates" />
              <PreviewItem label="Who" value="2 guests" />
              <PreviewItem label="Meal Plan" value="All Meal Plans" />
              <PreviewItem label="Residency" value="Non-Resident" />
              <button type="button" className="rounded-full border border-line px-5 py-2 text-sm font-semibold uppercase text-slate-500">
                Explore
              </button>
            </div>
          </div>
        </div>
      </section>
      <p className="mt-3 text-sm text-slate-500">Preview updates as you edit</p>
    </div>
  );
}

function LogoTools({
  settings,
  logoSource,
  pendingLogoImage,
  setSettings,
  chooseLogo,
  uploadLogo,
  setToast,
  className = ""
}: {
  settings: IbeSettings;
  logoSource: string;
  pendingLogoImage: string;
  setSettings: React.Dispatch<React.SetStateAction<IbeSettings>>;
  chooseLogo: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  uploadLogo: () => void;
  setToast: (message: string) => void;
  className?: string;
}) {
  const displayWidth = Math.max(160, Math.min(settings.logoWidth, 520));
  const displayHeight = Math.max(100, Math.min(settings.logoHeight, 360));

  return (
    <div className={className}>
      <h3 className="mb-4 text-base font-semibold text-slate-500">Logo</h3>
      <div className="rounded-lg border border-line bg-white p-4">
        <div className="mx-auto grid place-items-center rounded-md bg-black p-5" style={{ width: displayWidth, height: displayHeight, maxWidth: "100%" }}>
          {logoSource ? (
            <img src={logoSource} alt="IBE logo" className="h-full w-full object-contain" />
          ) : (
            <div className="text-center text-amber-500">
              <div className="text-6xl font-bold leading-none">R</div>
              <div className="mt-4 text-4xl font-bold tracking-wide">RONAKA</div>
              <div className="text-xs tracking-[0.3em]">AIRPORT TRANSIT HOTEL</div>
            </div>
          )}
        </div>
      </div>

      <h4 className="mt-6 text-base font-semibold text-slate-500">Logo Dimensions</h4>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <NumberField label="Width (px)" value={settings.logoWidth} onChange={(value) => setSettings((current) => ({ ...current, logoWidth: value }))} />
        <NumberField label="Height (px)" value={settings.logoHeight} onChange={(value) => setSettings((current) => ({ ...current, logoHeight: value }))} />
      </div>
      <button
        type="button"
        onClick={() => setToast("Logo dimensions saved")}
        className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-line bg-white text-sm font-semibold hover:bg-slate-50"
      >
        <Check className="h-4 w-4" />
        Save Dimensions
      </button>

      <input type="file" accept="image/*" onChange={chooseLogo} className="mt-5 block w-full rounded-md border border-line px-3 py-2 text-sm" />
      <button
        type="button"
        onClick={uploadLogo}
        disabled={!pendingLogoImage}
        className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-slate-500 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        <UploadCloud className="h-4 w-4" />
        Upload
      </button>
    </div>
  );
}

// IBE Policies tab
function IbePoliciesTab({
  settings,
  updatePolicy,
  setToast
}: {
  settings: IbeSettings;
  updatePolicy: <K extends keyof IbePolicies>(key: K, value: IbePolicies[K]) => void;
  setToast: (message: string) => void;
}) {
  const policies = settings.policies;

  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <h2 className="mb-7 text-2xl font-semibold">IBE Policies</h2>
      <div className="space-y-8">
        <PolicyEditor
          label="Cancellation Policy"
          value={policies.cancellationPolicy}
          placeholder="Enter cancellation policy..."
          onChange={(value) => updatePolicy("cancellationPolicy", value)}
          onSave={() => setToast("Cancellation policy saved")}
        />
        <PolicyEditor
          label="Child Policy"
          value={policies.childPolicy}
          placeholder="Enter child policy..."
          onChange={(value) => updatePolicy("childPolicy", value)}
          onSave={() => setToast("Child policy saved")}
        />
        <PolicyEditor
          label="Tax Policy"
          value={policies.taxPolicy}
          placeholder="Enter tax policy..."
          onChange={(value) => updatePolicy("taxPolicy", value)}
          onSave={() => setToast("Tax policy saved")}
        />
      </div>
    </section>
  );
}

// Packages tab
function PackagesTab({ packages, onAdd, onRemove }: { packages: IbePackage[]; onAdd: () => void; onRemove: (packageId: string) => void }) {
  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h2 className="inline-flex items-center gap-3 text-2xl font-semibold">
          <Package className="h-6 w-6" />
          Package Management
        </h2>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex h-12 items-center gap-2 rounded-md bg-ink px-6 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          Add Package
        </button>
      </div>

      {packages.length === 0 ? (
        <div className="grid min-h-32 place-items-center text-center text-slate-500">No packages found. Click &quot;Add Package&quot; to create one.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Package Code</th>
                <th className="px-4 py-3">Package Type</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Min Stay</th>
                <th className="px-4 py-3">Sales GL Account</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {packages.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-4 font-semibold">{item.code}</td>
                  <td className="px-4 py-4">{item.type}</td>
                  <td className="max-w-xs px-4 py-4 text-slate-600">
                    <div className="line-clamp-2">{item.description || "-"}</div>
                    {item.imageUrl ? <div className="mt-1 truncate text-xs text-blue-600">{item.imageUrl}</div> : null}
                  </td>
                  <td className="px-4 py-4 text-right font-semibold">
                    {item.currency.split(" - ")[0]} {item.price.toLocaleString()}
                  </td>
                  <td className="px-4 py-4">{item.duration} days</td>
                  <td className="px-4 py-4">{item.minStay} nights</td>
                  <td className="px-4 py-4">{item.salesGlAccount}</td>
                  <td className="px-4 py-4 text-right">
                    <button type="button" onClick={() => onRemove(item.id)} className="text-sm font-semibold text-red-500 hover:text-red-600">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// Min Stay tab
function MinStayTab({
  settings,
  startDate,
  onStartDateChange,
  onCreate,
  onEdit
}: {
  settings: IbeSettings;
  startDate: string;
  onStartDateChange: (date: string) => void;
  onCreate: () => void;
  onEdit: (roomType: string, date: string) => void;
}) {
  const dates = useMemo(() => Array.from({ length: 14 }, (_, index) => addDays(startDate, index)), [startDate]);
  const minStayRooms = roomTypes.filter((room) => room.name !== "Deluxe Single Room");

  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Min Stay Configuration</h2>
          <p className="mt-1 text-sm text-slate-500">Create or edit min stay rules by date and room type.</p>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex h-12 items-center gap-2 rounded-md bg-ink px-6 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          Create Min Stay
        </button>
      </div>

      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onStartDateChange(addDays(startDate, -14))}
            className="grid h-11 w-11 place-items-center rounded-md border border-line bg-white hover:bg-slate-50"
            aria-label="Previous date range"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="min-w-52 rounded-md border border-line bg-white px-4 py-3 text-center font-semibold">{formatDateRangeLabel(startDate, addDays(startDate, 13))}</div>
          <button
            type="button"
            onClick={() => onStartDateChange(addDays(startDate, 14))}
            className="grid h-11 w-11 place-items-center rounded-md border border-line bg-white hover:bg-slate-50"
            aria-label="Next date range"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm text-slate-500">Click or drag across a row to edit min stays.</p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="min-w-[1180px] w-full table-fixed text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="w-56 px-4 py-3 text-left font-semibold">Room Type</th>
              {dates.map((date) => (
                <th key={date} className="px-3 py-3 text-center font-semibold">
                  {formatShortDate(date)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {minStayRooms.map((room) => (
              <tr key={room.id} className="border-t border-line">
                <td className="px-4 py-4 font-semibold">{room.name}</td>
                {dates.map((date) => {
                  const value = getMinStayValue(settings, room.name, date);
                  const overridden = value !== 1;
                  return (
                    <td key={date} className="p-0 text-center">
                      <button
                        type="button"
                        onClick={() => onEdit(room.name, date)}
                        className={`h-12 w-full px-3 py-4 text-center font-semibold transition hover:bg-slate-100 ${
                          overridden ? "bg-amber-100 text-ink" : "bg-white text-ink"
                        }`}
                        title={`${room.name} ${formatLongDate(date)}`}
                      >
                        {value}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// IBE Rate tab
function IbeRateTab({
  settings,
  startDate,
  gridDays,
  onStartDateChange,
  onGridDaysChange,
  onOverride
}: {
  settings: IbeSettings;
  startDate: string;
  gridDays: number;
  onStartDateChange: (date: string) => void;
  onGridDaysChange: (days: number) => void;
  onOverride: (roomType: string, plan: string, currency: IbeRateCurrency, occupancy: number, date: string, currentPrice: number) => void;
}) {
  const dates = useMemo(() => Array.from({ length: gridDays }, (_, index) => addDays(startDate, index)), [gridDays, startDate]);

  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold">IBE Rate</h2>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onStartDateChange(addDays(startDate, -gridDays))}
            className="grid h-10 w-10 place-items-center rounded-md border border-line bg-white hover:bg-slate-50"
            aria-label="Previous IBE rate date range"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <label className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(event) => onStartDateChange(event.target.value)}
              className="focus-ring h-10 rounded-md border border-line bg-white pl-10 pr-4 text-sm font-semibold"
            />
          </label>
          <div className="rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold">
            {formatDateRangeLabel(startDate, addDays(startDate, gridDays - 1))}
          </div>
          <button
            type="button"
            onClick={() => onStartDateChange(addDays(startDate, gridDays))}
            className="grid h-10 w-10 place-items-center rounded-md border border-line bg-white hover:bg-slate-50"
            aria-label="Next IBE rate date range"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <label className="flex h-10 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold">
            Grid Days:
            <select value={gridDays} onChange={(event) => onGridDaysChange(Number(event.target.value))} className="bg-transparent outline-none">
              {ibeRateGridDayOptions.map((option) => (
                <option key={option} value={option}>
                  {option} Days
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full border-collapse text-sm" style={{ minWidth: 260 + dates.length * 92 }}>
          <thead>
            <tr className="border-b border-line bg-slate-50 text-slate-500">
              <th className="sticky left-0 z-10 w-64 bg-slate-50 px-4 py-4 text-left font-semibold">Room Type</th>
              {dates.map((date, index) => (
                <th
                  key={date}
                  className={`min-w-24 border-l border-line px-3 py-3 text-center font-semibold ${
                    index === 0 ? "bg-emerald-100 text-emerald-900" : isWeekendDate(date) ? "bg-red-100 text-red-600" : "bg-slate-50"
                  }`}
                >
                  <div>{formatWeekday(date)}</div>
                  <div>{formatMonthDay(date)}</div>
                </th>
              ))}
            </tr>
          </thead>
          {ibeRateRooms.map((room) => (
            <tbody key={room.roomType}>
              <tr className="border-b border-line bg-white">
                <td colSpan={dates.length + 1} className="px-4 py-3 font-semibold">
                  {room.roomType}
                </td>
              </tr>
              <tr className="border-b border-line bg-sky-50/80">
                <td className="sticky left-0 z-10 bg-sky-50/95 px-4 py-3 font-semibold">
                  <div>{room.roomType}</div>
                  <div className="mt-1 text-xs font-bold uppercase text-slate-500">AVL</div>
                </td>
                {dates.map((date) => (
                  <td key={date} className="border-l border-line px-3 py-3 text-center text-base font-semibold">
                    {room.availabilityOverrides?.[date] ?? room.availability}
                  </td>
                ))}
              </tr>
              {(["LKR", "USD"] as IbeRateCurrency[]).flatMap((currency) =>
                room.occupancies.map((occupancy) => {
                  const plan = makeIbeRatePlan(currency, occupancy);
                  const baseValue = currency === "LKR" ? room.lkrRate : room.usdRate;
                  return (
                    <tr key={`${room.roomType}-${currency}-${occupancy}`} className="border-b border-line">
                      <td className="sticky left-0 z-10 bg-white px-4 py-3 text-slate-500">
                        <span className="font-semibold">RO ({currency})</span>
                        <span className="ml-3 text-xs font-semibold">PAX {occupancy}</span>
                      </td>
                      {dates.map((date) => {
                        const value = getIbeRateValue(settings, room.roomType, plan, currency, occupancy, date, baseValue);
                        const overridden = hasIbeRateOverride(settings, room.roomType, plan, currency, occupancy, date);
                        return (
                          <td key={date} className="border-l border-line p-0 text-center">
                            <button
                              type="button"
                              onClick={() => onOverride(room.roomType, plan, currency, occupancy, date, value)}
                              className={`h-11 w-full px-3 font-semibold transition hover:bg-amber-100 ${overridden ? "bg-amber-100 text-ink" : "bg-white text-ink"}`}
                              title={`${room.roomType} ${plan} ${formatLongDate(date)}`}
                            >
                              {formatIbeGridValue(value, currency)}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          ))}
        </table>
      </div>
    </section>
  );
}

// Promo Code tab
function PromoCodeTab({
  promoCodes,
  viewMode,
  onViewModeChange,
  onAdd,
  onRemove,
  onToggleActive
}: {
  promoCodes: IbePromoCode[];
  viewMode: PromoCodeViewMode;
  onViewModeChange: (mode: PromoCodeViewMode) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onToggleActive: (id: string) => void;
}) {
  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            <h2 className="text-2xl font-semibold">Promo Code Management</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">View promo codes by booking and stay dates. Click a cell to edit.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border border-line bg-white p-1">
            <button
              type="button"
              onClick={() => onViewModeChange("grid")}
              className={`h-9 rounded px-3 text-sm font-semibold ${viewMode === "grid" ? "bg-slate-100 text-ink" : "text-slate-500 hover:text-ink"}`}
            >
              Grid
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("table")}
              className={`h-9 rounded px-3 text-sm font-semibold ${viewMode === "table" ? "bg-slate-100 text-ink" : "text-slate-500 hover:text-ink"}`}
            >
              Table
            </button>
          </div>
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex h-11 items-center gap-2 rounded-md bg-ink px-5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Add Promo Code
          </button>
        </div>
      </div>

      {promoCodes.length === 0 ? (
        <div className="flex min-h-32 items-center justify-center text-base text-slate-500">No promo codes found. Click "Add Promo Code" to create one.</div>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {promoCodes.map((promo) => (
            <article key={promo.id} className="rounded-lg border border-line bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{promo.code}</h3>
                  <p className="mt-1 text-sm text-slate-500">{promo.description || promo.promoType}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${promo.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                  {promo.active ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="mt-4 grid gap-3 text-sm">
                <PreviewItem label="Apply For" value={promo.applyFor} />
                <PreviewItem label="Percentage" value={`${promo.percentage}%`} />
                <PreviewItem label="Booking Period" value={formatLongDateRange(promo.bookingStartDate, promo.bookingEndDate)} />
                <PreviewItem label="Stay Period" value={formatLongDateRange(promo.stayStartDate, promo.stayEndDate)} />
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={() => onToggleActive(promo.id)} className="rounded-md border border-line px-3 py-2 text-sm font-semibold hover:bg-slate-50">
                  {promo.active ? "Deactivate" : "Activate"}
                </button>
                <button type="button" onClick={() => onRemove(promo.id)} className="rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="min-w-[980px] w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Promo Code</th>
                <th className="px-4 py-3 text-left font-semibold">Promo Type</th>
                <th className="px-4 py-3 text-left font-semibold">Apply For</th>
                <th className="px-4 py-3 text-right font-semibold">Percentage</th>
                <th className="px-4 py-3 text-left font-semibold">Booking Period</th>
                <th className="px-4 py-3 text-left font-semibold">Stay Period</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {promoCodes.map((promo) => (
                <tr key={promo.id} className="border-t border-line">
                  <td className="px-4 py-4 font-semibold">{promo.code}</td>
                  <td className="px-4 py-4">{promo.promoType}</td>
                  <td className="px-4 py-4">{promo.applyFor}</td>
                  <td className="px-4 py-4 text-right">{promo.percentage}%</td>
                  <td className="px-4 py-4">{formatDateRangeLabel(promo.bookingStartDate, promo.bookingEndDate)}</td>
                  <td className="px-4 py-4">{formatDateRangeLabel(promo.stayStartDate, promo.stayEndDate)}</td>
                  <td className="px-4 py-4">{promo.active ? "Active" : "Inactive"}</td>
                  <td className="px-4 py-4 text-right">
                    <button type="button" onClick={() => onToggleActive(promo.id)} className="mr-2 text-sm font-semibold text-blue-600">
                      Toggle
                    </button>
                    <button type="button" onClick={() => onRemove(promo.id)} className="text-sm font-semibold text-red-600">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// Smart Pricing tab
function SmartPricingTab({
  settings,
  updateSmartPricing,
  setToast
}: {
  settings: SmartPricingSettings;
  updateSmartPricing: <K extends keyof SmartPricingSettings>(key: K, value: SmartPricingSettings[K]) => void;
  setToast: (message: string) => void;
}) {
  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Smart Pricing</h2>
          <p className="mt-1 text-sm text-slate-500">Session-only pricing rules for IBE rates. Supabase can store these rules later.</p>
        </div>
        <label className="inline-flex items-center gap-3 rounded-md border border-line px-4 py-3 text-sm font-semibold">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(event) => updateSmartPricing("enabled", event.target.checked)}
            className="h-5 w-5 rounded border-line accent-slate-950"
          />
          Smart Pricing Active
        </label>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <NumberField label="Base Adjustment (%)" value={settings.baseAdjustmentPercent} onChange={(value) => updateSmartPricing("baseAdjustmentPercent", value)} />
        <NumberField label="Weekend Adjustment (%)" value={settings.weekendAdjustmentPercent} onChange={(value) => updateSmartPricing("weekendAdjustmentPercent", value)} />
        <NumberField label="High Occupancy Threshold (%)" value={settings.highOccupancyThreshold} onChange={(value) => updateSmartPricing("highOccupancyThreshold", value)} />
        <NumberField
          label="High Occupancy Adjustment (%)"
          value={settings.highOccupancyAdjustmentPercent}
          onChange={(value) => updateSmartPricing("highOccupancyAdjustmentPercent", value)}
        />
        <NumberField label="Low Occupancy Threshold (%)" value={settings.lowOccupancyThreshold} onChange={(value) => updateSmartPricing("lowOccupancyThreshold", value)} />
        <NumberField
          label="Low Occupancy Discount (%)"
          value={settings.lowOccupancyDiscountPercent}
          onChange={(value) => updateSmartPricing("lowOccupancyDiscountPercent", value)}
        />
        <NumberField label="Minimum Rate Guard" value={settings.minRateGuard} onChange={(value) => updateSmartPricing("minRateGuard", value)} />
        <NumberField label="Maximum Rate Guard" value={settings.maxRateGuard} onChange={(value) => updateSmartPricing("maxRateGuard", value)} />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-line bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-500">Weekend Rule</p>
          <p className="mt-2 text-2xl font-semibold">+{settings.weekendAdjustmentPercent}%</p>
        </div>
        <div className="rounded-lg border border-line bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-500">High Occupancy</p>
          <p className="mt-2 text-2xl font-semibold">
            {settings.highOccupancyThreshold}% or more: +{settings.highOccupancyAdjustmentPercent}%
          </p>
        </div>
        <div className="rounded-lg border border-line bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-500">Low Occupancy</p>
          <p className="mt-2 text-2xl font-semibold">
            {settings.lowOccupancyThreshold}% or less: -{settings.lowOccupancyDiscountPercent}%
          </p>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <button
          type="button"
          onClick={() => setToast("Smart pricing settings saved for this session")}
          className="inline-flex h-11 items-center gap-2 rounded-md bg-ink px-6 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
        >
          <Check className="h-4 w-4" />
          Save Settings
        </button>
      </div>
    </section>
  );
}

function PlaceholderTab({ tab }: { tab: IbeTab }) {
  return (
    <section className="rounded-lg border border-line bg-white p-8 text-center shadow-sm">
      <ImageIcon className="mx-auto mb-4 h-10 w-10 text-slate-300" />
      <h2 className="text-xl font-semibold">{tab}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
        This tab is ready in the IBE navigation. Send the screenshots for this section and it can be wired with the same session-only behavior.
      </p>
    </section>
  );
}

function PolicyEditor({
  label,
  value,
  placeholder,
  onChange,
  onSave
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <div>
      <label className="block">
        <span className="mb-3 block text-sm font-semibold text-slate-500">{label}</span>
        <textarea
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="focus-ring min-h-36 w-full rounded-md border border-line bg-white p-4 font-mono text-sm leading-relaxed"
        />
      </label>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={onSave}
          className="inline-flex h-11 items-center gap-2 rounded-md border border-line bg-white px-6 text-sm font-semibold shadow-sm hover:bg-slate-50"
        >
          <Check className="h-4 w-4" />
          Save
        </button>
      </div>
    </div>
  );
}

function IbeRateOverrideDialog({
  draft,
  setDraft,
  onClose,
  onSave
}: {
  draft: IbeRateDrawerState;
  setDraft: React.Dispatch<React.SetStateAction<IbeRateDrawerState | null>>;
  onClose: () => void;
  onSave: (draft: IbeRateDrawerState) => void;
}) {
  const canSave = Boolean(draft.startDate && draft.endDate && draft.days > 0 && Number.isFinite(draft.value));
  const calculatedValue = calculateIbeRateFinalValue(draft.currentPrice, draft.mode, draft.value, draft.currency);

  function update(patch: Partial<IbeRateDrawerState>) {
    setDraft((current) => {
      if (!current) return current;
      const next = { ...current, ...patch };
      const changedStartDate = Object.prototype.hasOwnProperty.call(patch, "startDate");
      const changedEndDate = Object.prototype.hasOwnProperty.call(patch, "endDate");
      const changedDays = Object.prototype.hasOwnProperty.call(patch, "days");

      if (changedStartDate || changedDays) {
        next.days = Math.max(1, Math.round(Number.isFinite(next.days) ? next.days : 1));
        next.endDate = addDays(next.startDate, next.days - 1);
      } else if (changedEndDate) {
        next.days = daysBetweenInclusive(next.startDate, next.endDate);
      }

      return next;
    });
  }

  function changeMode(mode: IbeRateMode) {
    update({ mode, value: mode === "SET" ? draft.currentPrice : 0 });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Value Override">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (canSave) onSave(draft);
        }}
        className="w-full max-w-xl rounded-lg bg-white p-7 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Value Override</h2>
            <div className="mt-3 space-y-1 text-sm text-slate-500">
              <p>
                <span className="font-semibold">Room Type:</span> {draft.roomType} <span className="ml-2">PAX {draft.occupancy}</span>
              </p>
              <p>
                <span className="font-semibold">Plan:</span> {draft.plan}
              </p>
              <p>
                <span className="font-semibold">Date:</span> {formatLongDate(draft.date)}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-md text-slate-500 hover:bg-slate-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-5 flex items-center justify-between gap-4 rounded-lg border border-line bg-slate-50 px-4 py-3">
          <span className="text-sm font-semibold">Current Price</span>
          <span className="text-lg font-semibold">
            {formatIbeGridValue(draft.currentPrice, draft.currency)} {draft.currency}
          </span>
        </div>

        <div className="mb-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {(["SET", "+", "-", "%"] as IbeRateMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => changeMode(mode)}
                className={`h-10 min-w-11 rounded-md border px-4 text-sm font-semibold ${
                  draft.mode === mode ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:bg-slate-50"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-500">Value</span>
            <span className="relative block">
              <input
                type="number"
                min={0}
                value={Number.isFinite(draft.value) ? draft.value : 0}
                onChange={(event) => update({ value: Number(event.target.value) })}
                className="focus-ring h-12 w-full rounded-md border border-line bg-white px-4 pr-16 text-sm"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                {draft.mode === "%" ? "%" : draft.currency}
              </span>
            </span>
          </label>
          <p className="mt-2 text-sm text-slate-500">
            Price will be set to {formatIbeGridValue(calculatedValue, draft.currency)} {draft.currency}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <DateInput label="Custom Date Range From" value={draft.startDate} onChange={(value) => update({ startDate: value })} />
          <DateInput label="Custom Date Range To" value={draft.endDate} onChange={(value) => update({ endDate: value })} />
        </div>
        <div className="mt-4">
          <FormNumberField label="Enter Number of Days" value={draft.days} onChange={(value) => update({ days: value })} />
          <p className="mt-2 text-sm text-slate-500">Calculated Range: {formatLongDateRange(draft.startDate, draft.endDate)}</p>
        </div>

        <div className="mt-7 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="h-11 rounded-md border border-line bg-white px-6 text-sm font-semibold hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSave}
            className="h-11 rounded-md bg-ink px-7 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

function CreatePromoCodeDrawer({ onClose, onSave }: { onClose: () => void; onSave: (nextPromoCode: IbePromoCode) => void }) {
  const [form, setForm] = useState<Omit<IbePromoCode, "id">>({
    code: "",
    promoType: "Percentage",
    description: "",
    applyFor: "Resident",
    percentage: 0,
    bookingStartDate: "2026-06-16",
    bookingEndDate: "2026-06-29",
    stayStartDate: "2026-06-16",
    stayEndDate: "2026-06-29",
    active: true,
    showOnIbe: true
  });

  const hasValidBookingRange = form.bookingStartDate <= form.bookingEndDate;
  const hasValidStayRange = form.stayStartDate <= form.stayEndDate;
  const canSave = Boolean(form.code.trim() && hasValidBookingRange && hasValidStayRange);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;
    onSave({
      ...form,
      id: `ibe-promo-${Date.now()}`,
      code: form.code.trim().toUpperCase(),
      description: form.description.trim(),
      percentage: Math.max(0, form.percentage)
    });
  }

  return (
    <SideDrawer
      title="Create Promo Code"
      subtitle="Fill in the details to create a new promo code."
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="h-11 rounded-md border border-line bg-white px-6 text-sm font-semibold hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="submit"
            form="create-ibe-promo-form"
            disabled={!canSave}
            className="h-11 rounded-md bg-ink px-7 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            Create Promo Code
          </button>
        </>
      }
    >
      <form id="create-ibe-promo-form" onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <FormTextField label="Promo Code *" value={form.code} placeholder="e.g. SUMMER25" onChange={(value) => update("code", value)} autoFocus />
          <FormSelectField label="Promo Type *" value={form.promoType} options={promoTypeOptions} onChange={(value) => update("promoType", value)} />
        </div>
        <FormTextarea label="Description" value={form.description} placeholder="Enter promo description" onChange={(value) => update("description", value)} />
        <div className="grid gap-4 md:grid-cols-2">
          <FormSelectField label="Apply For *" value={form.applyFor} options={promoApplyForOptions} onChange={(value) => update("applyFor", value)} />
          <FormNumberField label="Percentage (%)" value={form.percentage} onChange={(value) => update("percentage", value)} />
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold text-slate-500">Booking Period *</p>
          <div className="grid gap-3 md:grid-cols-2">
            <DateInput label="From" value={form.bookingStartDate} onChange={(value) => update("bookingStartDate", value)} />
            <DateInput label="To" value={form.bookingEndDate} onChange={(value) => update("bookingEndDate", value)} />
          </div>
          {!hasValidBookingRange ? <p className="mt-2 text-sm font-semibold text-red-600">Booking end date must be after the start date.</p> : null}
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold text-slate-500">Stay Period *</p>
          <div className="grid gap-3 md:grid-cols-2">
            <DateInput label="From" value={form.stayStartDate} onChange={(value) => update("stayStartDate", value)} />
            <DateInput label="To" value={form.stayEndDate} onChange={(value) => update("stayEndDate", value)} />
          </div>
          {!hasValidStayRange ? <p className="mt-2 text-sm font-semibold text-red-600">Stay end date must be after the start date.</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-5">
          <label className="inline-flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={form.active} onChange={(event) => update("active", event.target.checked)} className="h-5 w-5 rounded border-line accent-slate-950" />
            Active
          </label>
          <label className="inline-flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={form.showOnIbe}
              onChange={(event) => update("showOnIbe", event.target.checked)}
              className="h-5 w-5 rounded border-line accent-slate-950"
            />
            Show on IBE
          </label>
        </div>
      </form>
    </SideDrawer>
  );
}

function CreatePackageDrawer({ onClose, onSave }: { onClose: () => void; onSave: (nextPackage: IbePackage) => void }) {
  const [form, setForm] = useState<Omit<IbePackage, "id">>({
    code: "",
    type: "",
    description: "",
    price: 0,
    currency: "LKR - Sri Lanka Rupees",
    duration: 0,
    minStay: 0,
    salesGlAccount: "",
    imageUrl: ""
  });

  const canSave = Boolean(form.code.trim() && form.type.trim() && form.currency.trim() && form.salesGlAccount.trim());

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;
    onSave({
      ...form,
      code: form.code.trim(),
      type: form.type.trim(),
      description: form.description.trim(),
      salesGlAccount: form.salesGlAccount.trim(),
      imageUrl: form.imageUrl.trim(),
      price: Math.max(0, form.price),
      duration: Math.max(0, Math.round(form.duration)),
      minStay: Math.max(0, Math.round(form.minStay)),
      id: `ibe-package-${Date.now()}`
    });
  }

  return (
    <SideDrawer
      title="Create New Package"
      subtitle="Fill in the details to create a new package."
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="h-11 rounded-md border border-line bg-white px-6 text-sm font-semibold hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="submit"
            form="create-ibe-package-form"
            disabled={!canSave}
            className="h-11 rounded-md bg-ink px-7 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            Save
          </button>
        </>
      }
    >
      <form id="create-ibe-package-form" onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <FormTextField label="Package Code *" value={form.code} placeholder="Enter package code" onChange={(value) => update("code", value)} autoFocus />
          <FormTextField label="Package Type *" value={form.type} placeholder="Enter package type" onChange={(value) => update("type", value)} />
        </div>
        <FormTextarea label="Description" value={form.description} placeholder="Enter package description" onChange={(value) => update("description", value)} />
        <div className="grid gap-4 md:grid-cols-2">
          <FormNumberField label="Price *" value={form.price} onChange={(value) => update("price", value)} />
          <FormSelectField
            label="Currency *"
            value={form.currency}
            onChange={(value) => update("currency", value)}
            options={["LKR - Sri Lanka Rupees", "USD - US Dollars", "EUR - Euro", "GBP - British Pounds"]}
          />
          <FormNumberField label="Duration (days) *" value={form.duration} onChange={(value) => update("duration", value)} />
          <FormNumberField label="Min Stay *" value={form.minStay} onChange={(value) => update("minStay", value)} />
        </div>
        <FormSelectField
          label="Sales GL Account *"
          value={form.salesGlAccount}
          onChange={(value) => update("salesGlAccount", value)}
          placeholder="Select sales GL account"
          options={["Room Revenue", "Package Revenue", "Food and Beverage Revenue", "Other Income"]}
        />
        <FormTextField label="Image URL" value={form.imageUrl} placeholder="https://example.com/image.jpg" onChange={(value) => update("imageUrl", value)} />
      </form>
    </SideDrawer>
  );
}

function MinStayDrawer({
  draft,
  setDraft,
  onClose,
  onSave,
  onClear
}: {
  draft: MinStayDrawerState;
  setDraft: React.Dispatch<React.SetStateAction<MinStayDrawerState | null>>;
  onClose: () => void;
  onSave: (draft: MinStayDrawerState) => void;
  onClear: (draft: MinStayDrawerState) => void;
}) {
  const isCreate = draft.mode === "create";
  const canSave = Boolean(draft.roomType && draft.startDate && draft.endDate && draft.nights > 0 && datesInRange(draft.startDate, draft.endDate).length > 0);

  function update(patch: Partial<MinStayDrawerState>) {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }

  return (
    <SideDrawer
      title={isCreate ? "Create Min Stay" : "Edit Min Stay"}
      subtitle={isCreate ? "Select a room type, date range, and minimum stay to create new rules." : `Update the selected range for ${draft.roomType}.`}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={() => (isCreate ? update({ roomType: "", startDate: "", endDate: "", nights: 0 }) : onClear(draft))}
            className="h-11 rounded-md border border-line bg-white px-6 text-sm font-semibold hover:bg-slate-50"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => onSave(draft)}
            disabled={!canSave}
            className="h-11 rounded-md bg-ink px-7 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isCreate ? "Save Min Stay" : "Save Changes"}
          </button>
        </>
      }
    >
      <div className="space-y-6">
        {isCreate ? (
          <FormSelectField
            label="Hotel Room Type *"
            value={draft.roomType}
            onChange={(value) => update({ roomType: value })}
            placeholder="Select hotel room type"
            options={roomTypes.filter((room) => room.name !== "Deluxe Single Room").map((room) => room.name)}
            autoFocus
          />
        ) : (
          <FormTextField label="Selected Range" value={formatLongDateRange(draft.startDate, draft.endDate)} onChange={() => undefined} disabled />
        )}

        <div>
          <p className="mb-3 text-sm font-semibold text-slate-500">{isCreate ? "Date Range *" : "Adjust Date Range"}</p>
          <div className="grid gap-3 md:grid-cols-2">
            <DateInput label="From" value={draft.startDate} onChange={(value) => update({ startDate: value })} />
            <DateInput label="To" value={draft.endDate} onChange={(value) => update({ endDate: value })} />
          </div>
        </div>

        <FormNumberField label="Minimum Stay (nights) *" value={draft.nights} onChange={(value) => update({ nights: value })} />
      </div>
    </SideDrawer>
  );
}

function SideDrawer({
  title,
  subtitle,
  onClose,
  children,
  footer
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" role="dialog" aria-modal="true" aria-label={title}>
      <aside className="flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl">
        <header className="border-b border-line p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-ink">{title}</h2>
              {subtitle ? <p className="mt-3 text-sm text-slate-500">{subtitle}</p> : null}
            </div>
            <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-md text-slate-500 hover:bg-slate-100" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
        {footer ? <footer className="flex justify-end gap-3 border-t border-line p-6">{footer}</footer> : null}
      </aside>
    </div>
  );
}

function FormTextField({
  label,
  value,
  placeholder,
  onChange,
  autoFocus = false,
  disabled = false
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-500">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        autoFocus={autoFocus}
        disabled={disabled}
        className="focus-ring h-12 w-full rounded-md border border-line bg-white px-4 text-sm disabled:bg-slate-100"
      />
    </label>
  );
}

function FormTextarea({ label, value, placeholder, onChange }: { label: string; value: string; placeholder?: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-500">{label}</span>
      <textarea
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="focus-ring min-h-28 w-full rounded-md border border-line bg-white p-4 text-sm"
      />
    </label>
  );
}

function FormNumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-500">{label}</span>
      <input
        type="number"
        min={0}
        value={Number.isFinite(value) ? value : 0}
        onChange={(event) => onChange(Number(event.target.value))}
        className="focus-ring h-12 w-full rounded-md border border-line bg-white px-4 text-sm"
      />
    </label>
  );
}

function FormSelectField({
  label,
  value,
  options,
  onChange,
  placeholder,
  autoFocus = false
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoFocus={autoFocus}
        className="focus-ring h-12 w-full rounded-md border border-line bg-white px-4 text-sm"
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function DateInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <span className="relative block">
        <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="focus-ring h-12 w-full rounded-md border border-line bg-white pl-10 pr-4 text-sm"
        />
      </span>
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  muted = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  muted?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-500">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`focus-ring h-12 w-full rounded-md border border-line px-4 text-sm ${muted ? "bg-slate-100" : "bg-white"}`}
      />
    </label>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-500">{label}</span>
      <input
        type="number"
        min={0}
        value={Number.isFinite(value) ? value : 0}
        onChange={(event) => onChange(Number(event.target.value))}
        className="focus-ring h-12 w-full rounded-md border border-line bg-white px-4 text-sm"
      />
    </label>
  );
}

function InlineInfo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-slate-500">{label}</p>
      <p className="text-lg text-ink">{value}</p>
    </div>
  );
}

function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 py-2 text-base font-semibold">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 rounded border-line accent-slate-950" />
    </label>
  );
}

function PreviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function makeInitialSettings(): IbeSettings {
  return {
    activeTab: "Hotel Details",
    hotel: {
      hotelName: property.name,
      city: "katunayake",
      address: "Ronaka hotel,no 09,airport junction,18th mile post,liyanagemulla,seeduwa",
      country: property.country,
      phone: "+94703551340",
      email: "ronakahotel@gmail.com",
      hotelType: "Hotel",
      starCategory: property.starCategory,
      numberOfRooms: property.rooms,
      currencyCode: property.currency
    },
    config: {
      headerColour: "#000000",
      ibeActive: true,
      allowPay50: false,
      payAtProperty: false,
      allowPayLater: false,
      payLaterDays: 0,
      childFriendly: false,
      childAgeMin: 0,
      childAgeMax: 0
    },
    policies: {
      cancellationPolicy:
        "1)Non-refundable - The guest will be charged the total price of the reservation if they cancel at any time.\n2)Guests unable to provide valid resident identification at check-in will be charged the applicable non-resident rate difference.",
      childPolicy: "Children ages 13 and below stay free of charge.",
      taxPolicy: ""
    },
    packages: [],
    minStayRules: {},
    ibeRateOverrides: [],
    promoCodes: [],
    smartPricing: {
      enabled: false,
      baseAdjustmentPercent: 0,
      weekendAdjustmentPercent: 10,
      highOccupancyThreshold: 80,
      highOccupancyAdjustmentPercent: 15,
      lowOccupancyThreshold: 35,
      lowOccupancyDiscountPercent: 10,
      minRateGuard: 0,
      maxRateGuard: 0
    },
    ibeHomeImage: "",
    logoImage: "",
    logoWidth: 400,
    logoHeight: 200,
    bannerOffsetX: 0,
    bannerOffsetY: 0,
    bannerScale: 1
  };
}

function normalizeIbeSettings(settings: IbeSettings): IbeSettings {
  const base = makeInitialSettings();
  const partial = settings as Partial<IbeSettings>;
  const partialSmartPricing = partial.smartPricing && typeof partial.smartPricing === "object" ? partial.smartPricing : {};

  return {
    ...base,
    ...partial,
    hotel: {
      ...base.hotel,
      ...partial.hotel
    },
    config: {
      ...base.config,
      ...partial.config
    },
    policies: {
      ...base.policies,
      ...partial.policies
    },
    packages: Array.isArray(partial.packages) ? partial.packages : [],
    minStayRules: partial.minStayRules && typeof partial.minStayRules === "object" ? partial.minStayRules : {},
    ibeRateOverrides: Array.isArray(partial.ibeRateOverrides) ? partial.ibeRateOverrides : [],
    promoCodes: Array.isArray(partial.promoCodes) ? partial.promoCodes : [],
    smartPricing: {
      ...base.smartPricing,
      ...partialSmartPricing
    }
  };
}

function isHexColour(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function makeMinStayKey(roomType: string, date: string) {
  return `${roomType}::${date}`;
}

function getMinStayValue(settings: IbeSettings, roomType: string, date: string) {
  const value = settings.minStayRules[makeMinStayKey(roomType, date)];
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function parseDateValue(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return new Date(2026, 5, 16);
  return new Date(year, month - 1, day);
}

function formatDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(value: string, days: number) {
  const date = parseDateValue(value);
  date.setDate(date.getDate() + days);
  return formatDateValue(date);
}

function datesInRange(startDate: string, endDate: string) {
  if (!startDate || !endDate) return [];
  const start = parseDateValue(startDate);
  const end = parseDateValue(endDate);
  const from = start <= end ? start : end;
  const to = start <= end ? end : start;
  const dates: string[] = [];
  const current = new Date(from);

  while (current <= to && dates.length < 370) {
    dates.push(formatDateValue(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

function formatShortDate(value: string) {
  return parseDateValue(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatLongDate(value: string) {
  return parseDateValue(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateRangeLabel(startDate: string, endDate: string) {
  return `${formatShortDate(startDate)} - ${formatLongDate(endDate)}`;
}

function formatLongDateRange(startDate: string, endDate: string) {
  return `${formatLongDate(startDate)} - ${formatLongDate(endDate)}`;
}

function formatWeekday(value: string) {
  return parseDateValue(value).toLocaleDateString("en-US", { weekday: "short" });
}

function formatMonthDay(value: string) {
  return parseDateValue(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isWeekendDate(value: string) {
  const day = parseDateValue(value).getDay();
  return day === 0 || day === 6;
}

function daysBetweenInclusive(startDate: string, endDate: string) {
  return Math.max(1, datesInRange(startDate, endDate).length);
}

function makeIbeRatePlan(currency: IbeRateCurrency, occupancy: number) {
  return `RO_${currency}_${occupancy}`;
}

function dateIsInRange(value: string, startDate: string, endDate: string) {
  const current = parseDateValue(value).getTime();
  const start = parseDateValue(startDate).getTime();
  const end = parseDateValue(endDate).getTime();
  return current >= Math.min(start, end) && current <= Math.max(start, end);
}

function getIbeRateValue(
  settings: IbeSettings,
  roomType: string,
  plan: string,
  currency: IbeRateCurrency,
  occupancy: number,
  date: string,
  baseValue: number
) {
  const overrides = settings.ibeRateOverrides.filter(
    (item) =>
      item.roomType === roomType &&
      item.plan === plan &&
      item.currency === currency &&
      item.occupancy === occupancy &&
      dateIsInRange(date, item.startDate, item.endDate)
  );

  return overrides.length > 0 ? overrides[overrides.length - 1].finalValue : baseValue;
}

function hasIbeRateOverride(settings: IbeSettings, roomType: string, plan: string, currency: IbeRateCurrency, occupancy: number, date: string) {
  return settings.ibeRateOverrides.some(
    (item) =>
      item.roomType === roomType &&
      item.plan === plan &&
      item.currency === currency &&
      item.occupancy === occupancy &&
      dateIsInRange(date, item.startDate, item.endDate)
  );
}

function formatIbeGridValue(value: number, currency: IbeRateCurrency) {
  const precision = currency === "LKR" ? 0 : 2;
  const rounded = Number.isFinite(value) ? Number(value.toFixed(precision)) : 0;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: precision });
}

function calculateIbeRateFinalValue(currentPrice: number, mode: IbeRateMode, value: number, currency: IbeRateCurrency) {
  const safeCurrent = Number.isFinite(currentPrice) ? currentPrice : 0;
  const safeValue = Number.isFinite(value) ? value : 0;
  let nextValue = safeValue;

  if (mode === "+") nextValue = safeCurrent + safeValue;
  if (mode === "-") nextValue = safeCurrent - safeValue;
  if (mode === "%") nextValue = safeCurrent + safeCurrent * (safeValue / 100);

  const precision = currency === "LKR" ? 0 : 2;
  return Math.max(0, Number(nextValue.toFixed(precision)));
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load image"));
    image.src = source;
  });
}

async function compressImageSource(source: string, maxWidth: number, maxHeight: number, maxBytes: number) {
  const image = await loadImage(source);
  const ratio = Math.min(maxWidth / image.naturalWidth, maxHeight / image.naturalHeight, 1);
  let width = Math.max(1, Math.round(image.naturalWidth * ratio));
  let height = Math.max(1, Math.round(image.naturalHeight * ratio));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not available");

  let last = "";
  for (let sizePass = 0; sizePass < 7; sizePass += 1) {
    canvas.width = width;
    canvas.height = height;
    context.drawImage(image, 0, 0, width, height);

    for (let quality = 0.82; quality >= 0.34; quality -= 0.08) {
      const next = canvas.toDataURL("image/jpeg", quality);
      last = next;
      if (estimateDataUrlBytes(next) <= maxBytes) return next;
    }

    width = Math.max(1, Math.round(width * 0.82));
    height = Math.max(1, Math.round(height * 0.82));
  }

  return last;
}

function estimateDataUrlBytes(dataUrl: string) {
  return Math.round(dataUrl.length * 0.75);
}
