import { api, getApiErrorMessage } from "./api";
import { currentSessionUser } from "./current-user";

export type ReportCatalogItem = {
  report_type: string;
  title: string;
  group: string;
  available: boolean;
  required_modules: string[];
};

export type ReportParameters = {
  date_from: string;
  date_to: string;
  as_of: string;
  currency?: string;
  reservation_status?: string;
};

export type ReportColumn = {
  key: string;
  label: string;
};

export type GeneratedReport = {
  report_type: string;
  title: string;
  group: string;
  property_id: string;
  generated_at: string;
  parameters: ReportParameters;
  columns: ReportColumn[];
  rows: Array<Record<string, unknown>>;
  summary: Record<string, unknown>;
  totals: Record<string, unknown>;
  limitations: string[];
};

type CatalogResponse = {
  count: number;
  reports: ReportCatalogItem[];
};

type GenerateResponse = {
  message: string;
  report_run_id: string;
  report: GeneratedReport;
};

export async function getReportCatalog() {
  const response = await api.get<CatalogResponse>("/reports/catalog");
  return response.data.reports;
}

export async function generateReport(
  propertyId: string,
  reportType: string,
  parameters: ReportParameters
) {
  const response = await api.post<GenerateResponse>(
    "/reports/generate",
    {
      property_id: propertyId,
      report_type: reportType,
      format: "json",
      parameters: compactParameters(parameters)
    },
    { headers: actorHeaders() }
  );
  return response.data;
}

export async function downloadReportCsv(
  propertyId: string,
  reportType: string,
  parameters: ReportParameters
) {
  const response = await api.post<Blob>(
    "/reports/generate",
    {
      property_id: propertyId,
      report_type: reportType,
      format: "csv",
      parameters: compactParameters(parameters)
    },
    {
      headers: actorHeaders(),
      responseType: "blob"
    }
  );
  return response.data;
}

export function getReportsApiErrorMessage(error: unknown) {
  return getApiErrorMessage(error, "The report could not be generated.");
}

function compactParameters(parameters: ReportParameters) {
  return Object.fromEntries(
    Object.entries(parameters).filter(([, value]) => value !== "")
  );
}

function actorHeaders() {
  return {
    "x-user-id": currentSessionUser.email,
    "x-user-name": currentSessionUser.name,
    "x-user-email": currentSessionUser.email
  };
}
