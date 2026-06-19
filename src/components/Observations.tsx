import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface Observation {
  emoji: string;
  text: string;
}

export default function Observations({ observations }: { observations: Observation[] }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div id="observations-section-card" className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-[#0A0A0A] text-[10px] text-zinc-500 font-mono border border-[#1A1A1A]">
            02
          </span>
          <h3 className="text-xs font-mono uppercase tracking-widest text-[#777]">
            Audit Observations // Playbook Anomalies
          </h3>
        </div>
        <button
          id="toggle-observations-btn"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1 text-[9px] text-zinc-400 font-mono hover:text-white transition-colors bg-[#0A0A0A] hover:bg-[#0F0F0F] px-2.5 py-1 rounded border border-[#1A1A1A] uppercase"
        >
          {isOpen ? (
            <>
              collapse <ChevronUp size={12} className="inline ml-1" />
            </>
          ) : (
            <>
              expand ({observations.length}) <ChevronDown size={12} className="inline ml-1" />
            </>
          )}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id="observations-expanded-container"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border border-[#1A1A1A] bg-[#0A0A0A] rounded-xl overflow-hidden">
              {observations.map((obs, idx) => (
                <motion.div
                  key={idx}
                  id={`observation-row-${idx}`}
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: idx * 0.05 + 0.1, duration: 0.25 }}
                  className={`flex items-start gap-4 p-5 hover:bg-[#050505] transition-colors ${
                    idx !== observations.length - 1 ? "border-b border-[#1A1A1A]" : ""
                  }`}
                >
                  <span className="text-xl mt-0.5 select-none" role="img" aria-label="observation-emoji">
                    {obs.emoji || "🕵️"}
                  </span>
                  <div className="space-y-1">
                    <p className="text-[12px] font-mono text-zinc-300 leading-relaxed">
                      {obs.text}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
