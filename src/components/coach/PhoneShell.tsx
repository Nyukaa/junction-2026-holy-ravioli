import type { ReactNode } from "react";
import { StatusBar } from "./StatusBar";

export function PhoneShell({
  children,
  nav,
}: {
  children: ReactNode;
  nav?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-stretch justify-center bg-[#dfe9df] p-0 sm:items-center sm:p-6">
      <div className="relative flex h-screen w-full max-w-[420px] flex-col overflow-hidden bg-[#f0f7f2] shadow-none sm:h-[860px] sm:rounded-[44px] sm:border sm:border-black/5 sm:shadow-2xl">
        <StatusBar />
        <div className="flex-1 overflow-y-auto">{children}</div>
        {nav}
        <div className="mx-auto my-1 h-1 w-28 rounded-full bg-slate-900/60" />
      </div>
    </div>
  );
}
