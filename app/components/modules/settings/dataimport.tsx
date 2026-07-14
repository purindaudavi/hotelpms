"use client";

import { type ChangeEvent, useState } from "react";
import { FileSpreadsheet, Download, Hammer } from "lucide-react";

export function DataImportPage({ setToast }: { setToast: (message: string) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[][]>([]);

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setPreview([]);
  }

  function downloadTemplate() {
    const columns = ["Res. No", "Guest Name", "Email", "Phone", "Country", "Reservation Date", "Arrival / Check-in Date", "Departure / Check-out Date", "Room Number", "Rate", "Adults", "Children", "Currency", "Remark", "Guest Remark"];
    const blob = new Blob([`${columns.join(",")}\n`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "reservation-import-template.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    setToast("Import template downloaded");
  }

  async function buildPayloads() {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setToast(`${file.name} selected. Excel parsing will be connected with the import API later.`);
      return;
    }
    const rows = (await file.text()).split(/\r?\n/).filter(Boolean).map(parseCsvRow);
    setPreview(rows.slice(0, 6));
    setToast(`${Math.max(rows.length - 1, 0)} import payloads built`);
  }

  return (
    <main className="space-y-6 p-4 lg:p-6">
      <header>
        <h1 className="text-3xl font-bold">Data Import</h1>
        <p className="mt-1 text-slate-500">Import reservations from an Excel or CSV file and prepare booking payloads.</p>
      </header>
      <section className="rounded-lg border border-line bg-white p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-2xl font-semibold"><FileSpreadsheet className="h-6 w-6" />Excel or CSV file</h2>
        <p className="mt-2 max-w-6xl text-sm leading-6 text-slate-500">Upload an Excel (.xlsx, .xls) or CSV (.csv) file. Res. No is required. Duplicate checks use Res. No. Reservation dates, room number, rate, guest details and remarks map into reservation payload fields.</p>
        <input type="file" accept=".csv,.xlsx,.xls" onChange={chooseFile} className="mt-6 block w-full rounded-md border border-line p-3 text-sm" />
        <div className="mt-4 flex flex-wrap gap-3">
          <button onClick={downloadTemplate} className="inline-flex h-11 items-center gap-2 rounded-md border border-line px-4 font-semibold"><Download className="h-4 w-4" />Download template</button>
          <button onClick={buildPayloads} disabled={!file} className="inline-flex h-11 items-center gap-2 rounded-md bg-ink px-4 font-semibold text-white disabled:opacity-40"><Hammer className="h-4 w-4" />Build payloads</button>
        </div>
        {preview.length ? <div className="mt-6 overflow-x-auto"><h3 className="mb-3 font-semibold">Payload preview</h3><table className="min-w-max text-left text-sm"><tbody>{preview.map((row, index) => <tr key={index} className="border-b border-line">{row.map((cell, cellIndex) => <td key={cellIndex} className={`px-3 py-2 ${index === 0 ? "font-semibold" : ""}`}>{cell}</td>)}</tr>)}</tbody></table></div> : null}
      </section>
    </main>
  );
}

function parseCsvRow(line: string) {
  const cells: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && line[index + 1] === '"') { value += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) { cells.push(value); value = ""; }
    else value += character;
  }
  cells.push(value);
  return cells;
}
