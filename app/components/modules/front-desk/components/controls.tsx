export function DeskButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-ink px-5 text-sm font-semibold text-white hover:bg-slate-800">
      {children}
    </button>
  );
}

export function IconButton({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="grid h-10 w-10 place-items-center rounded-md border border-line bg-white text-slate-700 hover:bg-slate-50">
      {children}
    </button>
  );
}
