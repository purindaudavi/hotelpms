"use client";

import { useEffect, useState } from "react";
import { readLocalStorageValue, useLocalStorageState, writeLocalStorageValue } from "@/app/components/hooks/use-local-storage-state";
import { Edit3, Save } from "lucide-react";
import {
  createPropertyRecord,
  getPropertyApiErrorMessage,
  getPropertyImages,
  getPropertyRecord,
  isPropertyNotFound,
  updatePropertyInfoRecord
} from "@/app/lib/property-api";
import { PropertyInfo } from "./propertyinfo";
import { PropertyImages } from "./propertyimage";
import { MealAllocationTab } from "./mealallocation";
import { PaymentGatewayTab } from "./paymentagateway";
import { CurrencyTab } from "./currency";
import { TaxesTab } from "./taxes";
import { ThemeTab } from "./theme";
import { HotelFeaturesTab } from "./hotel features";
import type { CurrencyRecord, GatewayName, GatewaySettings, PropertyDetails, PropertyImageRecord, TaxRecord, ThemeSettings } from "./property-types";

const tabs = ["Property Info", "Property Image", "Meal Allocation", "Payment Gateway", "Taxes", "Currency", "Theme", "Hotel Features"] as const;
type Tab = (typeof tabs)[number];

export const initialProperty: PropertyDetails = {
  hotelName: "Ronaka Airport Transit Hotel", hotelType: "Hotel", hotelGuid: "2fe1e67a-5dc0-486d-8496-34fcdb233cf7", starCategory: "3",
  numberOfRooms: "14", onTrial: false, plan: "", description: "Welcome to Ronaka Airport Transit Hotel in Katunayake, Sri Lanka—your ideal haven for a restful stay just minutes from Bandaranaike International Airport.",
  address: "Ronaka hotel, no 09, airport junction, 18th mile post, Liyanagemulla, Seeduwa", city: "Katunayake", zipCode: "11450", country: "LK",
  phone: "+94703551340", email: "ronakahotel@gmail.com", website: "", checkInTime: "14:00", checkOutTime: "11:00", homeCurrency: "LKR", languageCode: "EN", timezone: "Asia/Colombo",
  logoWidth: "", logoHeight: "", ibeLogoWidth: "400", ibeLogoHeight: "200", supportPin: "", invoiceFooter: "", invoiceNotes: "",
  createdOn: "2026-05-22T10:51:10.92", createdTimestamp: "2026-05-22T10:51:10.92", lastUpdatedOn: "2026-05-28T11:57:15.71",
  lastUpdatedTimestamp: "2026-05-28T11:57:15.71", lastUpdatedBy: "System", cmPropertyId: "5e8666e6-9259-41b6-a51f-20126b58931c",
  cmActive: true, latitude: "7.154879124956874", longitude: "79.87194690853357", logoUrl: ""
};

const blankGateway = (name: GatewayName): GatewaySettings => ({ active: false, sandbox: false, bankName: "HNB", ipgName: name.toUpperCase().replace(" ", "_"), merchantIdUsd: "", profileIdUsd: "", accessKeyUsd: "", secretKeyUsd: "", merchantIdLkr: "", profileIdLkr: "", accessKeyLkr: "", secretKeyLkr: "", paypalMerchantId: "", paypalConnected: false });
const initialCurrencies: CurrencyRecord[] = [
  { id: "LKR", code: "LKR", name: "Sri Lanka Rupees", symbol: "LKR", hotelToCurrency: 1, isDefault: true },
  { id: "USD", code: "USD", name: "United States Dollar", symbol: "$", hotelToCurrency: 0.003, isDefault: false },
  { id: "EUR", code: "EUR", name: "Euro", symbol: "€", hotelToCurrency: 0.0026, isDefault: false },
  { id: "GBP", code: "GBP", name: "British Pound Sterling", symbol: "£", hotelToCurrency: 0.0022, isDefault: false }
];
const defaultTheme: ThemeSettings = { mode: "light", autoDetect: false, accent: "#3b82f6", statusColors: { "Confirmed Reservation": "#10b981", Tentative: "#f59e0b", "Checked-out": "#ef4444", "Checked-in": "#06b6d4", Cancelled: "#6b7280", "No Show": "#78716c", "No-Show (Surcharge)": "#57534e", Block: "#a855f7", "OUT OF ORDER": "#1f2937", InvalidCC: "#be185d" } };

export function PropertySettingsPage({ propertyId, setToast }: { propertyId: string; setToast: (message: string) => void }) {
  const key = (suffix: string) => `staypilot:${propertyId}:property:${suffix}`;
  const [activeTab, setActiveTab] = useState<Tab>("Property Info");
  const [editing, setEditing] = useState(false);
  const [details, setDetails] = useState<PropertyDetails>(initialProperty);
  const [propertyVersion, setPropertyVersion] = useState(0);
  const [propertyExists, setPropertyExists] = useState(false);
  const [propertyLoading, setPropertyLoading] = useState(true);
  const [propertySaving, setPropertySaving] = useState(false);
  const [propertyError, setPropertyError] = useState("");
  const [images, setImages] = useState<PropertyImageRecord[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const gatewayFallback = Object.fromEntries((["CyberSource", "PayPal", "Skrill", "Stripe", "Google Pay", "Apple Pay"] as GatewayName[]).map((name) => [name, blankGateway(name)])) as Record<GatewayName, GatewaySettings>;
  const [gateways, setGateways] = useLocalStorageState<Record<GatewayName, GatewaySettings>>(key("gateways"), () => readLocalStorageValue("staypilot.property.gateways", gatewayFallback));
  const [currencies, setCurrencies] = useLocalStorageState<CurrencyRecord[]>(key("currencies"), () => readLocalStorageValue("staypilot.property.currencies", initialCurrencies));
  const [manualRates, setManualRates] = useLocalStorageState(key("manualRates"), () => readLocalStorageValue("staypilot.property.manualRates", false));
  const [taxes, setTaxes] = useLocalStorageState<TaxRecord[]>(key("taxes"), () => readLocalStorageValue("staypilot.property.taxes", []));
  const [theme, setTheme] = useLocalStorageState<ThemeSettings>(key("theme"), () => readLocalStorageValue("staypilot.property.theme", defaultTheme));
  const [features, setFeatures] = useLocalStorageState<string[]>(key("features"), () => readLocalStorageValue("staypilot.property.features", ["24-hour security", "Air conditioning & heating", "Airport shuttle", "Breakfast", "CCTV", "Daily housekeeping", "Free parking", "Free Wifi", "Front Desk"]));

  useEffect(() => {
    let cancelled = false;
    const cachedValue = readLocalStorageValue(key("details"), readLocalStorageValue("staypilot.property.details", initialProperty));
    const cached = { ...initialProperty, ...cachedValue };
    setDetails(cached);
    setPropertyLoading(true);
    setPropertyError("");

    void getPropertyRecord(propertyId, cached)
      .then((record) => {
        if (cancelled) return;
        setDetails(record.details);
        setPropertyVersion(record.version);
        setPropertyExists(true);
        writeLocalStorageValue(key("details"), record.details);
      })
      .catch((error) => {
        if (cancelled) return;
        if (isPropertyNotFound(error)) {
          setPropertyExists(false);
          setPropertyError("This property has not been created in MongoDB yet. Edit and save to create it.");
          return;
        }
        setPropertyError(getPropertyApiErrorMessage(error));
      })
      .finally(() => {
        if (!cancelled) setPropertyLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  useEffect(() => {
    let cancelled = false;
    if (!propertyExists) {
      setImages([]);
      setImagesLoading(false);
      return;
    }

    setImagesLoading(true);
    void getPropertyImages(propertyId)
      .then((records) => {
        if (!cancelled) setImages(records);
      })
      .catch((error) => {
        if (!cancelled) setPropertyError(getPropertyApiErrorMessage(error));
      })
      .finally(() => {
        if (!cancelled) setImagesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [propertyExists, propertyId]);

  async function refreshImages() {
    if (!propertyExists) return;
    setImagesLoading(true);
    try {
      setImages(await getPropertyImages(propertyId));
    } finally {
      setImagesLoading(false);
    }
  }

  async function toggleEdit() {
    if (!editing) {
      setPropertyError("");
      setEditing(true);
      return;
    }

    setPropertySaving(true);
    setPropertyError("");
    try {
      const record = propertyExists
        ? await updatePropertyInfoRecord(propertyId, details, propertyVersion)
        : await createPropertyRecord(propertyId, details);
      setDetails(record.details);
      setPropertyVersion(record.version);
      setPropertyExists(true);
      setEditing(false);
      writeLocalStorageValue(key("details"), record.details);
      setToast(`Property information ${propertyExists ? "updated" : "created"} in MongoDB`);
    } catch (error) {
      setPropertyError(getPropertyApiErrorMessage(error));
    } finally {
      setPropertySaving(false);
    }
  }

  return (
    <main className="p-4 lg:p-6">
      <section className="rounded-xl border border-line bg-white p-5 shadow-sm lg:p-7">
        <header className="mb-6 flex items-center justify-between gap-4">
          <h1 className="text-3xl font-bold">Property Details</h1>
          <button onClick={() => void toggleEdit()} disabled={propertyLoading || propertySaving} className="inline-flex h-11 items-center gap-2 rounded-md bg-ink px-5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
            {editing ? <Save className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}{propertySaving ? "Saving..." : editing ? "Save" : "Edit"}
          </button>
        </header>
        {propertyLoading ? <div className="mb-5 rounded-md border border-line bg-slate-50 px-4 py-3 text-sm text-slate-600">Loading property information from MongoDB...</div> : null}
        {propertyError ? <div className="mb-5 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">{propertyError}</div> : null}
        <nav className="table-scroll mb-6 overflow-x-auto rounded-lg bg-slate-100 p-1" aria-label="Property settings tabs">
          <div className="flex min-w-max">
            {tabs.map((tab) => <button key={tab} onClick={() => setActiveTab(tab)} className={`rounded-md px-4 py-2.5 text-sm font-semibold ${activeTab === tab ? "bg-white text-ink shadow-sm" : "text-slate-500 hover:text-ink"}`}>{tab}</button>)}
          </div>
        </nav>

        {activeTab === "Property Info" ? <PropertyInfo value={{ ...details, logoUrl: images.find((image) => image.imageType === "logo")?.url || "" }} onChange={setDetails} editing={editing} setToast={setToast} /> : null}
        {activeTab === "Property Image" ? <PropertyImages propertyId={propertyId} propertyExists={propertyExists} images={images} editing={editing} loading={imagesLoading} onRefresh={refreshImages} setToast={setToast} /> : null}
        {activeTab === "Meal Allocation" ? <MealAllocationTab propertyId={propertyId} propertyExists={propertyExists} homeCurrency={details.homeCurrency} setToast={setToast} /> : null}
        {activeTab === "Payment Gateway" ? <PaymentGatewayTab gateways={gateways} setGateways={setGateways} setToast={setToast} /> : null}
        {activeTab === "Taxes" ? <TaxesTab taxes={taxes} setTaxes={setTaxes} setToast={setToast} /> : null}
        {activeTab === "Currency" ? <CurrencyTab currencies={currencies} setCurrencies={setCurrencies} manualRates={manualRates} setManualRates={setManualRates} hotelCurrency={details.homeCurrency} setToast={setToast} /> : null}
        {activeTab === "Theme" ? <ThemeTab value={theme} setValue={setTheme} defaults={defaultTheme} setToast={setToast} /> : null}
        {activeTab === "Hotel Features" ? <HotelFeaturesTab selected={features} setSelected={setFeatures} editing={editing} /> : null}
      </section>
    </main>
  );
}
