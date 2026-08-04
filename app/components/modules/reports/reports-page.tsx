"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Download,
  Eye,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  X
} from "lucide-react";
import { property } from "@/app/data/pms-data";
import {
  downloadReportCsv,
  generateReport,
  getReportCatalog,
  getReportsApiErrorMessage,
  type GeneratedReport,
  type ReportCatalogItem,
  type ReportParameters
} from "@/app/lib/reports-api";

type ReportsPageProps = {
  propertyId: string;
  setToast: (message: string) => void;
};

export function ReportsPage({ propertyId, setToast }: ReportsPageProps) {
  const businessDate = property.systemDate;
  const [catalog, setCatalog] = useState<ReportCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [selectedReport, setSelectedReport] = useState<GeneratedReport | null>(null);
  const [generatingType, setGeneratingType] = useState("");
  const [downloadingType, setDownloadingType] = useState("");
  const [zoom, setZoom] = useState(100);
  const [filters, setFilters] = useState<ReportParameters>({
    date_from: monthStart(businessDate),
    date_to: businessDate,
    as_of: businessDate,
    currency: ""
  });

  useEffect(() => {
    void loadCatalog();
  }, []);

  const groups = useMemo(() => {
    const grouped = new Map<string, ReportCatalogItem[]>();
    catalog.forEach((report) => {
      grouped.set(report.group, [...(grouped.get(report.group) ?? []), report]);
    });
    return Array.from(grouped, ([title, reports]) => ({ title, reports }));
  }, [catalog]);

  async function loadCatalog() {
    setCatalogLoading(true);
    setCatalogError("");
    try {
      setCatalog(await getReportCatalog());
    } catch (error) {
      setCatalog([]);
      setCatalogError(getReportsApiErrorMessage(error));
    } finally {
      setCatalogLoading(false);
    }
  }

  function validatePeriod() {
    if (!filters.date_from || !filters.date_to || !filters.as_of) {
      return "Date From, Date To and As Of are required.";
    }
    if (filters.date_to < filters.date_from) {
      return "Date To cannot be before Date From.";
    }
    return "";
  }

  async function openReport(report: ReportCatalogItem) {
    if (!report.available || generatingType) return;
    const validationError = validatePeriod();
    if (validationError) {
      setToast(validationError);
      return;
    }

    setGeneratingType(report.report_type);
    try {
      const result = await generateReport(propertyId, report.report_type, filters);
      setSelectedReport(result.report);
      setZoom(100);
      setToast(`${report.title} generated from MongoDB`);
    } catch (error) {
      setToast(getReportsApiErrorMessage(error));
    } finally {
      setGeneratingType("");
    }
  }

  async function downloadReport(report: Pick<ReportCatalogItem, "report_type" | "title" | "available">) {
    if (!report.available || downloadingType) return;
    const validationError = validatePeriod();
    if (validationError) {
      setToast(validationError);
      return;
    }

    setDownloadingType(report.report_type);
    try {
      const blob = await downloadReportCsv(propertyId, report.report_type, filters);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${report.report_type}-${filters.date_from}-${filters.date_to}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setToast(`${report.title} CSV downloaded`);
    } catch (error) {
      setToast(getReportsApiErrorMessage(error));
    } finally {
      setDownloadingType("");
    }
  }

  return (
    <main className="p-4 lg:p-6">
      <section className="rounded-lg border border-line bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl font-semibold">View and Download your Reports</h2>
            <p className="mt-2 text-sm text-slate-500">Reports are generated from MongoDB for the selected property and period.</p>
          </div>
          <button
            type="button"
            onClick={() => void loadCatalog()}
            disabled={catalogLoading}
            className="inline-flex h-11 items-center gap-2 rounded-md border border-line bg-white px-4 text-sm font-semibold disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${catalogLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="mt-6 grid gap-4 rounded-lg border border-line bg-slate-50 p-4 sm:grid-cols-2 xl:grid-cols-4">
          <DateFilter label="Date From" value={filters.date_from} onChange={(value) => setFilters((current) => ({ ...current, date_from: value }))} />
          <DateFilter label="Date To" value={filters.date_to} onChange={(value) => setFilters((current) => ({ ...current, date_to: value }))} />
          <DateFilter label="As Of" value={filters.as_of} onChange={(value) => setFilters((current) => ({ ...current, as_of: value }))} />
          <label className="grid gap-1 text-sm font-semibold">
            Currency
            <select
              value={filters.currency}
              onChange={(event) => setFilters((current) => ({ ...current, currency: event.target.value }))}
              className="focus-ring h-11 rounded-md border border-line bg-white px-3 text-sm"
            >
              <option value="">All currencies</option>
              <option value="LKR">LKR</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </label>
        </div>

        {catalogError ? (
          <div role="alert" className="mt-5 flex items-center gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            {catalogError}
          </div>
        ) : null}

        {catalogLoading ? (
          <div className="grid min-h-64 place-items-center text-slate-500">
            <span className="inline-flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" />Loading report catalog...</span>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 xl:grid-cols-3">
            {groups.map((group) => (
              <section key={group.title} className="rounded-lg border border-line bg-white p-6 shadow-sm">
                <h3 className="text-xl font-semibold">{group.title}</h3>
                <div className="mt-6 space-y-4">
                  {group.reports.map((report) => {
                    const generating = generatingType === report.report_type;
                    const downloading = downloadingType === report.report_type;
                    return (
                      <div key={report.report_type} className={`flex items-start justify-between gap-4 ${report.available ? "" : "opacity-55"}`}>
                        <div>
                          <p className="text-base font-medium">{report.title}</p>
                          {!report.available ? (
                            <p className="mt-1 text-xs text-amber-700">Requires: {report.required_modules.map(readableLabel).join(", ")}</p>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                          <ReportButton
                            label={`View ${report.title}`}
                            disabled={!report.available || Boolean(generatingType)}
                            onClick={() => void openReport(report)}
                          >
                            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                          </ReportButton>
                          <ReportButton
                            label={`Download ${report.title} CSV`}
                            disabled={!report.available || Boolean(downloadingType)}
                            onClick={() => void downloadReport(report)}
                          >
                            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                          </ReportButton>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>

      {selectedReport ? (
        <ReportViewerDrawer
          report={selectedReport}
          zoom={zoom}
          setZoom={setZoom}
          refreshing={generatingType === selectedReport.report_type}
          downloading={downloadingType === selectedReport.report_type}
          onRefresh={() => {
            const item = catalog.find((entry) => entry.report_type === selectedReport.report_type);
            if (item) void openReport(item);
          }}
          onDownload={() => void downloadReport({ ...selectedReport, available: true })}
          onClose={() => setSelectedReport(null)}
        />
      ) : null}
    </main>
  );
}

function ReportViewerDrawer({
  report,
  zoom,
  setZoom,
  refreshing,
  downloading,
  onRefresh,
  onDownload,
  onClose
}: {
  report: GeneratedReport;
  zoom: number;
  setZoom: (value: number) => void;
  refreshing: boolean;
  downloading: boolean;
  onRefresh: () => void;
  onDownload: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/45">
      <aside className="flex h-full w-full max-w-[1400px] flex-col overflow-hidden bg-white shadow-panel">
        <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-line bg-white px-5 py-2">
          <div>
            <h3 className="font-semibold">{report.title}</h3>
            <p className="text-xs text-slate-500">Generated {formatDateTime(report.generated_at)}</p>
          </div>

          <div className="flex items-center gap-2">
            <ReportButton label="Zoom out" onClick={() => setZoom(Math.max(75, zoom - 25))}><Minus className="h-5 w-5" /></ReportButton>
            <select value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="focus-ring h-10 rounded-md border border-line bg-white px-3 text-sm">
              {[75, 100, 125, 150].map((value) => <option key={value} value={value}>{value}%</option>)}
            </select>
            <ReportButton label="Zoom in" onClick={() => setZoom(Math.min(150, zoom + 25))}><Plus className="h-5 w-5" /></ReportButton>
            <ReportButton label="Regenerate report" disabled={refreshing} onClick={onRefresh}>
              <RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
            </ReportButton>
            <ReportButton label="Download CSV" disabled={downloading} onClick={onDownload}>
              {downloading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
            </ReportButton>
            <ReportButton label="Close" onClick={onClose}><X className="h-5 w-5" /></ReportButton>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-slate-100 p-6">
          <div
            className="mx-auto w-fit min-w-[1080px] border border-line bg-white p-10 shadow-lg"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
          >
            <ReportPreview report={report} />
          </div>
        </div>
      </aside>
    </div>
  );
}

function ReportPreview({ report }: { report: GeneratedReport }) {
  return (
    <div className="text-sm text-black">
      <div className="flex items-start justify-between gap-6 border-b-2 border-slate-900 pb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{property.name}</p>
          <h2 className="mt-1 text-2xl font-bold uppercase">{report.title}</h2>
        </div>
        <div className="text-right text-xs">
          <p>Period: {report.parameters.date_from} to {report.parameters.date_to}</p>
          <p>As of: {report.parameters.as_of}</p>
          <p>Currency: {report.parameters.currency || "All"}</p>
        </div>
      </div>

      {Object.keys(report.summary).length ? (
        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(report.summary).map(([key, value]) => (
            <div key={key} className="rounded border border-slate-300 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">{readableLabel(key)}</p>
              <p className="mt-1 font-bold">{formatValue(value)}</p>
            </div>
          ))}
        </section>
      ) : null}

      <div className="mt-6 overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-slate-800 text-white">
              {report.columns.map((column) => <th key={column.key} className="whitespace-nowrap border border-slate-600 px-3 py-2 text-left">{column.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {report.rows.map((row, index) => (
              <tr key={String(row.reservation_id ?? row.payment_id ?? row.room_type_id ?? `${report.report_type}-${index}`)} className="odd:bg-white even:bg-slate-50">
                {report.columns.map((column) => <td key={column.key} className="max-w-72 border border-slate-300 px-3 py-2 align-top">{formatValue(row[column.key])}</td>)}
              </tr>
            ))}
            {!report.rows.length ? (
              <tr><td colSpan={Math.max(report.columns.length, 1)} className="border border-slate-300 px-4 py-10 text-center text-slate-500">No records found for this period.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {Object.keys(report.totals).length ? (
        <section className="mt-6 rounded border border-slate-300 bg-slate-50 p-4">
          <h3 className="font-bold">Totals</h3>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(report.totals).map(([key, value]) => (
              <div key={key}><dt className="text-xs text-slate-500">{readableLabel(key)}</dt><dd className="font-semibold">{formatValue(value)}</dd></div>
            ))}
          </dl>
        </section>
      ) : null}

      {report.limitations.length ? (
        <section className="mt-5 rounded border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900">
          <strong>Report notes</strong>
          <ul className="mt-2 list-disc space-y-1 pl-5">{report.limitations.map((note) => <li key={note}>{note}</li>)}</ul>
        </section>
      ) : null}
    </div>
  );
}

function DateFilter({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-sm font-semibold">
      {label}
      <input type="date" value={value} onChange={(event) => onChange(event.target.value)} className="focus-ring h-11 rounded-md border border-line bg-white px-3 text-sm" />
    </label>
  );
}

function ReportButton({ label, children, onClick, disabled = false }: { label: string; children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-line bg-white text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function monthStart(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value.slice(0, 7)}-01` : value;
}

function readableLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number") return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => `${key}: ${formatValue(item)}`)
      .join(" · ");
  }
  return String(value);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
