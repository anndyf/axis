"use client";

import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="fixed inset-0 min-h-screen w-full flex flex-col items-center justify-center bg-white/90 backdrop-blur-md z-[9999] animate-fade-in overflow-hidden">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-accent-subtle animate-ping opacity-25" />
        <div className="relative bg-white p-6 rounded-xl shadow-card border border-zinc-100 flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-accent-fg animate-spin" strokeWidth={1.5} />
        </div>
      </div>
      
      <div className="mt-8 text-center space-y-2">
        <h2 className="text-xl font-bold text-fg tracking-tight">Carregando Sistema</h2>
        <p className="text-sm font-medium text-fg-subtle">Preparando seu ambiente acadêmico...</p>
      </div>

      <div className="fixed bottom-0 left-0 w-full h-1 bg-zinc-50 overflow-hidden">
        <div className="h-full bg-accent animate-progress-infinite" />
      </div>
    </div>
  );
}
