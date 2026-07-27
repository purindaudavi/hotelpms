import type { CurrencyRecord } from "@/app/components/modules/settings/property/property-types";

export const initialPropertyCurrencies: CurrencyRecord[] = [
  { id: "LKR", code: "LKR", name: "Sri Lanka Rupees", symbol: "LKR", hotelToCurrency: 1, isDefault: true },
  { id: "USD", code: "USD", name: "United States Dollar", symbol: "$", hotelToCurrency: 0.003, isDefault: false },
  { id: "EUR", code: "EUR", name: "Euro", symbol: "EUR", hotelToCurrency: 0.0026, isDefault: false },
  { id: "GBP", code: "GBP", name: "British Pound Sterling", symbol: "GBP", hotelToCurrency: 0.0022, isDefault: false }
];

export function propertyCurrenciesStorageKey(propertyId: string) {
  return `staypilot:${propertyId}:property:currencies`;
}

export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  homeCurrency: string,
  currencies: CurrencyRecord[]
) {
  const rateFromHome = (code: string) => {
    if (code === homeCurrency) return 1;
    const record = currencies.find((item) => item.code === code);
    return record && Number.isFinite(record.hotelToCurrency) && record.hotelToCurrency > 0
      ? record.hotelToCurrency
      : null;
  };
  const fromRate = rateFromHome(fromCurrency);
  const toRate = rateFromHome(toCurrency);
  if (fromRate === null || toRate === null) return null;
  return (amount / fromRate) * toRate;
}
