"use client";

import { ChangeEvent, useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";
import { getSavedChurchId } from "@/lib/workspace";

type Row = Record<string, unknown>;

const TEMPLATE_COLUMNS = [
  "First Name",
  "Last Name",
  "Date of Birth",
  "Gender",
  "Class Name",
  "Status",
  "Joined On",
  "Allergies",
  "Medical Notes",
  "Special Needs Notes",
  "Emergency Contact Name",
  "Emergency Contact Phone",
  "Primary Guardian Full Name",
  "Primary Guardian Relationship",
  "Primary Guardian Phone",
  "Primary Guardian WhatsApp",
  "Primary Guardian Email",
  "Primary Guardian Authorised Pickup",
  "Secondary Guardian Full Name",
  "Secondary Guardian Relationship",
  "Secondary Guardian Phone",
  "Secondary Guardian WhatsApp",
  "Secondary Guardian Email",
  "Secondary Guardian Authorised Pickup",
];

const value = (input: unknown) => String(input ?? "").trim();
const key = (input: string) => input.toLowerCase().replace(/[^a-z0-9]/g, "");

function pick(raw: Row, ...names: string[]) {
  for (const name of names) {
    const found = Object.keys(raw).find((column) => key(column) === key(name));
    if (found) return raw[found];
  }
  return "";
}

function dateValue(input: unknown): string {
  if (typeof input === "number") {
    const parsed = XLSX.SSF.parse_date_code(input);
    if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
  }
  if (input instanceof Date && !Number.isNaN(input.getTime())) {
    return `${input.getFullYear()}-${String(input.getMonth() + 1).padStart(2, "0")}-${String(input.getDate()).padStart(2, "0")}`;
  }
  const text = value(input);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const match = text.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  return match ? `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}` : "";
}

function normalise(raw: Row) {
  const text = (...names: string[]) => value(pick(raw, ...names));
  return {
    first_name: text("First Name"),
    last_name: text("Last Name"),
    date_of_birth: dateValue(pick(raw, "Date of Birth", "DOB")),
    gender: text("Gender"),
    class_name: text("Class Name", "Class"),
    status: text("Status") || "active",
    joined_on: dateValue(pick(raw, "Joined On", "Date Joined")),
    allergies: text("Allergies"),
    medical_notes: text("Medical Notes"),
    special_needs_notes: text("Special Needs Notes"),
    emergency_contact_name: text("Emergency Contact Name"),
    emergency_contact_phone: text("Emergency Contact Phone"),
    primary_guardian_full_name: text("Primary Guardian Full Name"),
    primary_guardian_relationship: text("Primary Guardian Relationship"),
    primary_guardian_phone: text("Primary Guardian Phone"),
    primary_guardian_whatsapp: text("Primary Guardian WhatsApp"),
    primary_guardian_email: text("Primary Guardian Email"),
    primary_guardian_authorised_pickup: text("Primary Guardian Authorised Pickup"),
    secondary_guardian_full_name: text("Secondary Guardian Full Name"),
    secondary_guardian_relationship: text("Secondary Guardian Relationship"),
    secondary_guardian_phone: text("Secondary Guardian Phone"),
    secondary_guardian_whatsapp: text("Secondary Guardian WhatsApp"),
    secondary_guardian_email: text("Secondary Guardian Email"),
    secondary_guardian_authorised_pickup: text("Secondary Guardian Authorised Pickup"),
  };
}

type ImportRow = ReturnType<typeof normalise>;

function downloadTemplate() {
  const workbook = XLSX.utils.book_new();
  const recordsSheet = XLSX.utils.aoa_to_sheet([TEMPLATE_COLUMNS]);
  recordsSheet["!cols"] = TEMPLATE_COLUMNS.map((column) => ({ wch: Math.max(column.length + 3, 18) }));
  recordsSheet["!autofilter"] = { ref: `A1:${XLSX.utils.encode_col(TEMPLATE_COLUMNS.length - 1)}1` };

  const guideRows = [
    ["Children & Families Import Template"],
    ["Enter one child per row on the Child Records sheet. Keep the header names unchanged."],
    ["Required fields", "First Name, Last Name, Date of Birth"],
    ["Date of Birth / Joined On", "Enter dates as DD/MM/YYYY or YYYY-MM-DD. Date of Birth is required; Joined On is optional."],
    ["Class Name", "Use the exact name of a class already created for the selected church location."],
    ["Status", "Leave blank for active, or enter active, inactive, or graduated."],
    ["Guardian details", "All guardian fields are optional. Use one row per child; enter a second guardian in the Secondary Guardian columns."],
    ["Authorised Pickup", "Enter Yes or No for each guardian. Leave blank if not recorded."],
    ["Phone and email", "Enter phone numbers as text, including the country code when available."],
    ["Sensitive information", "Only include medical or emergency details needed by authorised church staff."],
    ["Before upload", "Save as .xlsx or .csv, then upload it from the Import Children & Families page."],
  ];
  const guideSheet = XLSX.utils.aoa_to_sheet(guideRows);
  guideSheet["!cols"] = [{ wch: 28 }, { wch: 100 }];

  XLSX.utils.book_append_sheet(workbook, recordsSheet, "Child Records");
  XLSX.utils.book_append_sheet(workbook, guideSheet, "Instructions");
  XLSX.writeFile(workbook, "childrens-department-import-template.xlsx");
}

export default function ImportPage() {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function read(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setMessage("");
    const reader = new FileReader();
    reader.onload = (result) => {
      try {
        const workbook = XLSX.read(result.target?.result, { type: "array", cellDates: true });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        if (!firstSheet) throw new Error("The workbook has no worksheets.");
        const parsed = XLSX.utils.sheet_to_json<Row>(firstSheet, { defval: "" }).map(normalise);
        setRows(parsed);
        setMessage(`${parsed.length} rows loaded for review.`);
      } catch {
        setRows([]);
        setMessage("Could not read this file. Download the Excel template and try again.");
      }
    };
    reader.onerror = () => setMessage("Could not read this file. Please try again.");
    reader.readAsArrayBuffer(file);
  }

  const invalid = rows.filter((row) => !row.first_name || !row.last_name || !row.date_of_birth);

  async function runImport() {
    const church = getSavedChurchId();
    if (!church) return setMessage("Choose a location before importing.");
    if (!rows.length) return setMessage("Choose a spreadsheet that contains at least one child row.");
    if (invalid.length) return setMessage(`Fix ${invalid.length} row(s) missing a first name, last name, or date of birth.`);

    setBusy(true);
    const { data, error } = await supabase.rpc("import_children_with_guardians", {
      p_church_id: church,
      p_filename: fileName,
      p_rows: rows,
    });
    setBusy(false);
    if (error) return setMessage(error.message);

    const result = data as { imported: number; skipped: number; failed: number };
    setMessage(`Import complete: ${result.imported} imported, ${result.skipped} duplicates skipped, ${result.failed} failed.`);
    if (result.failed === 0) setRows([]);
  }

  return (
    <main className="p-5 md:p-8">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold text-orange-700">Children & families</p>
        <h1 className="mt-1 text-2xl font-black">Import records</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Download the template, fill in one child per row, then upload it here. You can import linked primary and secondary guardian details with each child.
        </p>

        <section className="mt-6 flex flex-col justify-between gap-5 rounded-2xl border bg-white p-5 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-emerald-50 p-3 text-emerald-700"><FileSpreadsheet size={22} aria-hidden="true" /></span>
            <div>
              <h2 className="font-bold">Official Excel template</h2>
              <p className="mt-1 text-sm text-slate-600">Includes the accepted column headings and a second sheet with field guidance.</p>
            </div>
          </div>
          <button type="button" onClick={downloadTemplate} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900">
            <Download size={17} aria-hidden="true" /> Download Excel template
          </button>
        </section>

        <section className="mt-5 rounded-2xl border bg-white p-5">
          <h2 className="font-bold">Upload your completed sheet</h2>
          <p className="mt-1 text-sm text-slate-600">The first worksheet must be the Child Records sheet. Required fields are first name, last name, and date of birth.</p>
          <label htmlFor="import-file" className="mt-4 block text-sm font-semibold">Excel or CSV file</label>
          <input id="import-file" type="file" accept=".csv,.xlsx,.xls" onChange={read} className="mt-2 block w-full rounded-xl border p-3 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-semibold" />

          {rows.length > 0 && <>
            <div className="mt-5 overflow-x-auto rounded-xl border">
              <table className="w-full text-left text-sm">
                <thead><tr className="border-b bg-slate-50"><th className="p-3">Child</th><th className="p-3">Date of birth</th><th className="p-3">Class</th><th className="p-3">Primary guardian</th><th className="p-3">Review</th></tr></thead>
                <tbody>{rows.slice(0, 25).map((row, index) => {
                  const rowInvalid = !row.first_name || !row.last_name || !row.date_of_birth;
                  return <tr key={`${row.first_name}-${row.last_name}-${index}`} className="border-b last:border-0">
                    <td className="p-3">{row.first_name} {row.last_name}</td>
                    <td className="p-3">{row.date_of_birth || "—"}</td>
                    <td className="p-3">{row.class_name || "—"}</td>
                    <td className="p-3">{row.primary_guardian_full_name || "—"}</td>
                    <td className="p-3">{rowInvalid ? <span className="font-semibold text-red-700">Missing required details</span> : <span className="font-semibold text-emerald-700">Ready</span>}</td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
            <p className="mt-3 text-sm text-slate-600">{rows.length} rows loaded · {invalid.length} need attention · previewing first 25</p>
            <button type="button" disabled={busy || invalid.length > 0} onClick={runImport} className="mt-4 rounded-xl bg-orange-600 px-5 py-3 font-bold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50">
              {busy ? "Importing records..." : "Confirm import"}
            </button>
          </>}
        </section>

        {message && <p role="status" className="mt-4 rounded-xl bg-slate-100 p-3 text-sm text-slate-700">{message}</p>}
      </div>
    </main>
  );
}
