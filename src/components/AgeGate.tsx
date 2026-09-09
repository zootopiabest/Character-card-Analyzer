import { useState } from "react";
import { ShieldAlert } from "lucide-react";

const STORAGE_KEY = "loresieve_age_confirmed";

// First-launch 18+ self-attestation overlay. Confirmation persists in
// localStorage, so returning users never see it again.
export default function AgeGate() {
  const [confirmed, setConfirmed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [declined, setDeclined] = useState(false);

  if (confirmed) return null;

  const handleConfirm = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // Private-mode storage failures still let the session proceed.
    }
    setConfirmed(true);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#050505]/95 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="max-w-md w-full border border-[#2A2A2A] bg-[#0A0A0A] rounded-xl p-8 space-y-5 text-center shadow-[0_0_40px_rgba(0,240,255,0.06)]">
        <ShieldAlert size={32} className="mx-auto text-[#00F0FF]" />
        <h2 className="text-sm font-bold font-mono uppercase tracking-widest text-white">
          Adults Only — 18+
        </h2>

        {declined ? (
          <p className="text-xs text-zinc-400 leading-relaxed font-mono">
            This tool is only available to adults. See you when you&apos;re 18.
          </p>
        ) : (
          <>
            <p className="text-xs text-zinc-400 leading-relaxed">
              This tool analyzes user-provided character cards, which may contain
              mature or explicit themes, and displays unfiltered AI-generated
              critique. You must be 18 or older to use it.
            </p>
            <div className="flex flex-col gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleConfirm}
                className="w-full bg-[#00F0FF]/10 hover:bg-[#00F0FF]/20 border border-[#00F0FF]/40 text-[#00F0FF] font-mono text-[11px] font-bold uppercase tracking-wider px-4 py-2.5 rounded transition-all"
              >
                I am 18 or older — Enter
              </button>
              <button
                type="button"
                onClick={() => setDeclined(true)}
                className="w-full bg-transparent hover:bg-[#111] border border-[#2A2A2A] text-zinc-500 hover:text-zinc-300 font-mono text-[10px] uppercase tracking-wider px-4 py-2 rounded transition-all"
              >
                I am under 18
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
