"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Minus,
  Plus,
  RefreshCw,
  X
} from "lucide-react";
import { property, type Reservation } from "@/app/data/pms-data";

type ReportsPageProps = {
  reservations: Reservation[];
  setToast: (message: string) => void;
};

type ReportItem = {
  title: string;
  type: string;
};

type ReportGroup = {
  title: string;
  reports: ReportItem[];
};

const reportGroups: ReportGroup[] = [
  {
    title: "Collection",
    reports: [
      { title: "Collection Report", type: "collection-report" },
      { title: "Deposit Ledger", type: "deposit-ledger" }
    ]
  },
  {
    title: "Finance",
    reports: [
      { title: "Trial Balance", type: "trial-balance" },
      { title: "Profit & Loss", type: "profit-loss" }
    ]
  },
  {
    title: "Revenue",
    reports: [
      { title: "Revenue Report", type: "revenue-report" },
      { title: "Revenue Forecast - Room Revenue", type: "revenue-forecast" },
      { title: "Invoice Daybook", type: "invoice-daybook" }
    ]
  },
  {
    title: "Receivable",
    reports: [
      { title: "Customer Balance Summary", type: "customer-balance-summary" },
      { title: "AR Aging Summary", type: "ar-aging-summary" },
      { title: "In-House Guest Ledger", type: "in-house-guest-ledger" }
    ]
  },
  {
    title: "Sales",
    reports: [
      { title: "Item Sales", type: "item-sales" },
      { title: "Outlet Bills", type: "outlet-bills" }
    ]
  },
  {
    title: "Reservation",
    reports: [
      { title: "Information Sheet", type: "information-sheet" },
      { title: "List of Reservations", type: "reservation-list" }
    ]
  },
  {
    title: "Business",
    reports: [
      { title: "Busines Analysis", type: "business-analysis" },
      { title: "Arrival List", type: "arrival-list" },
      { title: "Travel Agent Performance", type: "travel-agent-performance" }
    ]
  },
  {
    title: "Occupancy",
    reports: [
      { title: "Inventory By Room Type", type: "inventory-by-room-type" },
      { title: "Occupancy by Date", type: "occupancy-by-date" }
    ]
  }
];

export function ReportsPage({ reservations, setToast }: ReportsPageProps) {
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);
  const [zoom, setZoom] = useState(100);

  const pdfUrl = useMemo(() => {
    if (!selectedReport) return "";
    return URL.createObjectURL(createReportPdf(selectedReport, reservations));
  }, [selectedReport, reservations]);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  function openReport(report: ReportItem) {
    setSelectedReport(report);
    setZoom(100);
  }

  function downloadReport(report: ReportItem) {
    const url = URL.createObjectURL(createReportPdf(report, reservations));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${slug(report.title)}.pdf`;
    anchor.click();
    URL.revokeObjectURL(url);
    setToast(`${report.title} downloaded`);
  }

  return (
    <main className="p-4 lg:p-6">
      <section className="rounded-lg border border-line bg-white p-6 shadow-sm">
        <h2 className="text-3xl font-semibold">View and Download your Reports</h2>

        <div className="mt-8 grid gap-5 xl:grid-cols-3">
          {reportGroups.map((group) => (
            <section key={group.title} className="rounded-lg border border-line bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold">{group.title}</h3>
              <div className="mt-6 space-y-3">
                {group.reports.map((report) => (
                  <div key={report.type} className="flex items-center justify-between gap-4 text-lg">
                    <span>{report.title}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openReport(report)}
                        aria-label={`View ${report.title}`}
                        title="View"
                        className="rounded-md p-1.5 text-slate-700 hover:bg-slate-100"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadReport(report)}
                        aria-label={`Download ${report.title}`}
                        title="Download"
                        className="rounded-md p-1.5 text-slate-700 hover:bg-slate-100"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>

      {selectedReport ? (
        <PdfViewerDrawer
          report={selectedReport}
          reservations={reservations}
          pdfUrl={pdfUrl}
          zoom={zoom}
          setZoom={setZoom}
          onDownload={() => downloadReport(selectedReport)}
          onClose={() => setSelectedReport(null)}
        />
      ) : null}
    </main>
  );
}

function PdfViewerDrawer({
  report,
  reservations,
  pdfUrl,
  zoom,
  setZoom,
  onDownload,
  onClose
}: {
  report: ReportItem;
  reservations: Reservation[];
  pdfUrl: string;
  zoom: number;
  setZoom: (value: number) => void;
  onDownload: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/45">
      <aside className="h-full w-full max-w-[1280px] overflow-hidden bg-white shadow-panel">
        <div className="flex h-16 items-center justify-between border-b border-line bg-white px-5">
          <div className="flex items-center gap-2">
            <ViewerButton label="First page">
              <ChevronFirst className="h-5 w-5" />
            </ViewerButton>
            <ViewerButton label="Previous page">
              <ChevronLeft className="h-5 w-5" />
            </ViewerButton>
            <span className="inline-flex h-11 min-w-[64px] items-center justify-center rounded-lg border border-line bg-white text-lg">1</span>
            <span className="text-slate-500">1</span>
            <ViewerButton label="Next page">
              <ChevronRight className="h-5 w-5" />
            </ViewerButton>
            <ViewerButton label="Last page">
              <ChevronLast className="h-5 w-5" />
            </ViewerButton>
          </div>

          <div className="flex items-center gap-2">
            <ViewerButton label="Zoom out" onClick={() => setZoom(Math.max(75, zoom - 25))}>
              <Minus className="h-5 w-5" />
            </ViewerButton>
            <select value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="focus-ring h-11 rounded-lg border border-line bg-white px-4 text-sm">
              {[75, 100, 125, 150].map((value) => (
                <option key={value} value={value}>{value}%</option>
              ))}
            </select>
            <ViewerButton label="Zoom in" onClick={() => setZoom(Math.min(150, zoom + 25))}>
              <Plus className="h-5 w-5" />
            </ViewerButton>
          </div>

          <div className="flex items-center gap-2">
            <ViewerButton label="Refresh">
              <RefreshCw className="h-5 w-5" />
            </ViewerButton>
            <ViewerButton label="Download PDF" onClick={onDownload}>
              <FileText className="h-5 w-5" />
            </ViewerButton>
            <ViewerButton label="Close" onClick={onClose}>
              <X className="h-5 w-5" />
            </ViewerButton>
          </div>
        </div>

        <div className="h-[calc(100%-4rem)] overflow-auto bg-slate-100 p-6">
          <div className="mx-auto w-fit border-[8px] border-slate-500 bg-white shadow-lg" style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}>
            <ReportPagePreview report={report} reservations={reservations} />
          </div>
          {pdfUrl ? <iframe title={`${report.title} PDF`} src={pdfUrl} className="hidden" /> : null}
        </div>
      </aside>
    </div>
  );
}

function ReportPagePreview({ report, reservations }: { report: ReportItem; reservations: Reservation[] }) {
  const rows = buildReportRows(report, reservations);

  return (
    <div className="relative h-[794px] w-[1123px] bg-white px-16 py-20 text-sm text-black">
      <div className="text-right">
        <h3 className="text-lg font-bold uppercase">{report.title}</h3>
        <p className="mt-2">As at Tuesday, June 16, 2026</p>
      </div>

      <table className="mt-8 w-full border-collapse text-xs">
        <thead>
          <tr className="bg-slate-300">
            {["Reservation No", "Guest Name", "Check-in", "ResCheckOut", "Deposit Amt.", "Receipt No", "Cashier"].map((heading) => (
              <th key={heading} className="px-3 py-2 text-left font-bold">{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.resNo}-${index}`} className="border-b border-dotted border-slate-500">
              <td className="px-3 py-3">{row.resNo}</td>
              <td className="px-3 py-3">{row.guest}</td>
              <td className="px-3 py-3">{row.checkIn}</td>
              <td className="px-3 py-3">{row.checkOut}</td>
              <td className="px-3 py-3 text-right">{row.amount}</td>
              <td className="px-3 py-3">{row.receipt}</td>
              <td className="px-3 py-3">{row.cashier}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={7} className="px-3 py-5 text-center text-base font-bold">TOTAL</td>
          </tr>
        </tbody>
      </table>

      <div className="absolute bottom-12 left-16 right-16 flex items-center justify-between text-xs">
        <span>6/16/2026</span>
        <span>3:18:37PM</span>
        <span>Page 1 of 1</span>
      </div>
    </div>
  );
}

function ViewerButton({ label, children, onClick }: { label: string; children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid h-11 w-11 place-items-center rounded-lg border border-line bg-slate-50 text-slate-700 hover:bg-slate-100"
    >
      {children}
    </button>
  );
}

function buildReportRows(report: ReportItem, reservations: Reservation[]) {
  const sourceRows = reservations.length ? reservations.slice(0, 6) : [];
  if (!sourceRows.length) {
    return [
      {
        resNo: "1",
        guest: "Test Guest",
        checkIn: "2026-06-16",
        checkOut: "2026-06-17",
        amount: "LKR 0.00",
        receipt: "TEST-001",
        cashier: "ASIRI PERERA"
      }
    ];
  }

  return sourceRows.map((booking, index) => ({
    resNo: report.type === "deposit-ledger" && index === 0 ? "1" : booking.resNo,
    guest: booking.guest,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    amount: `LKR ${booking.paid.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    receipt: `REC-${String(index + 1).padStart(3, "0")}`,
    cashier: "ASIRI PERERA"
  }));
}

function createReportPdf(report: ReportItem, reservations: Reservation[]) {
  const rows = buildReportRows(report, reservations);
  const lines = [
    property.name.toUpperCase(),
    report.title.toUpperCase(),
    "As at Tuesday, June 16, 2026",
    "",
    "Reservation No | Guest Name | Check-in | Check-out | Deposit Amt. | Receipt No | Cashier",
    ...rows.map((row) => `${row.resNo} | ${row.guest} | ${row.checkIn} | ${row.checkOut} | ${row.amount} | ${row.receipt} | ${row.cashier}`),
    "",
    "TOTAL",
    "",
    "6/16/2026     3:18:37PM                                      Page 1 of 1"
  ];
  const pdf = makeSimplePdf(lines);
  return new Blob([pdf], { type: "application/pdf" });
}

function makeSimplePdf(lines: string[]) {
  const content = [
    "BT",
    "/F1 11 Tf",
    "50 550 Td",
    ...lines.flatMap((line, index) => {
      const prefix = index === 0 ? [] : ["0 -18 Td"];
      return [...prefix, `(${escapePdfText(line)}) Tj`];
    }),
    "ET"
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
}

function escapePdfText(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "report";
}
