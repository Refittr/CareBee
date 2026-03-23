import { Activity, Pill, ShieldAlert, QrCode } from "lucide-react";

export function HeroMockup() {
  return (
    <div className="relative max-w-sm mx-auto">
      {/* Depth shadow layer */}
      <div className="absolute inset-0 translate-x-2 translate-y-2 bg-warmstone-100 rounded-xl border border-warmstone-200" />

      {/* Main card */}
      <div className="relative bg-warmstone-white border border-warmstone-200 rounded-xl shadow-lg overflow-hidden">
        {/* Card header */}
        <div className="bg-warmstone-900 px-5 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-honey-400 flex items-center justify-center text-white font-bold text-sm shrink-0">
            MM
          </div>
          <div>
            <div className="text-white font-bold text-base leading-tight">Margaret Mitchell</div>
            <div className="text-white/70 text-xs mt-0.5">78 years old &nbsp;&middot;&nbsp; NHS 485 777 3456</div>
          </div>
        </div>

        {/* Card body */}
        <div className="px-4 py-3 flex flex-col gap-3">
          {/* Conditions */}
          <div>
            <div className="text-xs font-bold text-warmstone-400 uppercase tracking-wide mb-1.5">
              Conditions
            </div>
            <ul className="flex flex-col gap-1">
              {["Type 2 diabetes", "Heart failure (Stage 2)", "Osteoarthritis"].map((condition) => (
                <li key={condition} className="flex items-center gap-2">
                  <Activity size={12} className="text-sage-400 shrink-0" />
                  <span className="text-sm text-warmstone-800">{condition}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Medications */}
          <div>
            <div className="text-xs font-bold text-warmstone-400 uppercase tracking-wide mb-1.5">
              Medications
            </div>
            <ul className="flex flex-col gap-1.5">
              <li className="flex items-center gap-2">
                <Pill size={12} className="text-honey-400 shrink-0" />
                <span className="text-sm text-warmstone-800 font-semibold">Metformin</span>
                <span className="text-xs text-warmstone-400">500mg, twice daily</span>
              </li>
              <li className="flex items-center gap-2">
                <Pill size={12} className="text-honey-400 shrink-0" />
                <span className="text-sm text-warmstone-800 font-semibold">Furosemide</span>
                <span className="text-xs text-warmstone-400">40mg, once daily</span>
              </li>
            </ul>
          </div>

          {/* Interaction warning */}
          <div className="bg-error-light border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2">
            <ShieldAlert size={14} className="text-error shrink-0" />
            <span className="text-xs text-error font-semibold">
              Interaction flag: Metformin + Furosemide
            </span>
          </div>

          {/* Footer row */}
          <div className="flex items-center justify-between pt-0.5 pb-1">
            <div className="bg-warmstone-50 border border-warmstone-100 rounded-lg px-3 py-1.5 flex items-center gap-2">
              <QrCode size={14} className="text-warmstone-600 shrink-0" />
              <span className="text-xs font-semibold text-warmstone-600">Emergency QR active</span>
            </div>
            <span className="text-xs text-warmstone-400">Updated 2h ago</span>
          </div>
        </div>
      </div>
    </div>
  );
}
