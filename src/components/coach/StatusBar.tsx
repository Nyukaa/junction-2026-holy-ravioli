export function StatusBar() {
  return (
    <div className="flex items-center justify-between px-6 pt-3 pb-1 text-[13px] font-semibold text-slate-900">
      <span>9:41</span>
      <div className="flex items-center gap-1.5 text-slate-800">
        <span className="inline-block h-2.5 w-3.5 rounded-sm bg-slate-900" />
        <span>⌁</span>
        <span className="relative inline-block h-2.5 w-5 rounded-[3px] border border-slate-900">
          <i className="absolute inset-0.5 block rounded-[1px] bg-slate-900" />
        </span>
      </div>
    </div>
  );
}
