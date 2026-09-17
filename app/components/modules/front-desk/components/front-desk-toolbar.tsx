import { Plus } from "lucide-react";
import { DeskButton } from "./controls";
import { DeskTab, deskTabs } from "../types";

type FrontDeskToolbarProps = {
  tab: DeskTab;
  onTabChange: (tab: DeskTab) => void;
  sourceFilter: string;
  onSourceFilterChange: (source: string) => void;
  sources: string[];
  showSourceFilter: boolean;
  onOpenReservation: () => void;
  onOpenBusinessBlocks: () => void;
};

export function FrontDeskToolbar({
  tab,
  onTabChange,
  sourceFilter,
  onSourceFilterChange,
  sources,
  showSourceFilter,
  onOpenReservation,
  onOpenBusinessBlocks
}: FrontDeskToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg bg-slate-100 p-1">
          {deskTabs.map((item) => (
            <button
              key={item}
              onClick={() => onTabChange(item)}
              className={`rounded-md px-4 py-2 text-sm font-semibold ${tab === item ? "bg-white shadow-sm" : "text-slate-500"}`}
            >
              {item}
            </button>
          ))}
        </div>
        {showSourceFilter ? (
          <select value={sourceFilter} onChange={(event) => onSourceFilterChange(event.target.value)} className="focus-ring h-10 rounded-md border border-line bg-white px-3 text-sm">
            {sources.map((source) => (
              <option key={source}>{source}</option>
            ))}
          </select>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <DeskButton onClick={onOpenReservation}>
          <Plus className="h-4 w-4" />
          Reservation
        </DeskButton>
        <DeskButton onClick={onOpenBusinessBlocks}>Business Block</DeskButton>
      </div>
    </div>
  );
}
