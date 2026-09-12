import { ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";
import { VerificationSummary } from "../types";

// Shown only when the user ran with Evidence Verification on. It exists so the
// second pass is visible work rather than silent plumbing: the reader can see
// how many written claims were checked against the card and how many the card
// did not support.
export default function VerificationBadge({ verification }: { verification?: VerificationSummary | null }) {
  if (!verification || typeof verification.checked !== "number") return null;
  const { checked, corrected, status, corrections } = verification;

  if (status === "unavailable") {
    return (
      <p className="mb-2 flex items-center gap-1.5 text-[10px] font-mono text-amber-500/80 [overflow-wrap:anywhere]">
        <ShieldQuestion size={12} className="shrink-0" />
        Verification unavailable — report shown as first written
      </p>
    );
  }

  const clean = corrected === 0;
  return (
    <div className="mb-2">
      <p className={`flex items-center gap-1.5 text-[10px] font-mono [overflow-wrap:anywhere] ${clean ? "text-[#4ADE80]/80" : "text-amber-400/90"}`}>
        {clean ? <ShieldCheck size={12} className="shrink-0" /> : <ShieldAlert size={12} className="shrink-0" />}
        Verified · {checked} claim{checked === 1 ? "" : "s"} checked
        {clean ? ", all supported" : `, ${corrected} corrected`}
      </p>
      {!clean && corrections?.length > 0 && (
        <ul className="mt-1 space-y-0.5 pl-[18px]">
          {corrections.map((c, i) => (
            <li key={i} className="text-[9px] font-mono text-zinc-500 leading-relaxed [overflow-wrap:anywhere]">
              <span className="text-zinc-400">{c.label}</span>
              {c.problem ? ` — ${c.problem}` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
