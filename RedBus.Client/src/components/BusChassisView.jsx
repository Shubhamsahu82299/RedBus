import React from "react";

export default function BusChassisView({ 
  bus, 
  seats, 
  deck, 
  setDeck, 
  selected, 
  onToggleSeat, 
  primaryColor = "#D84E55" 
}) {
  const decks = [...new Set(seats.map((s) => s.deck))];
  const deckSeats = seats.filter((s) => s.deck === deck);
  const leftCols = bus?.layout === "SLEEPER" ? [1] : [1, 2];
  const rightCols = bus?.layout === "SLEEPER" ? [3, 4] : [4, 5];
  const rows = [...new Set(deckSeats.map((s) => s.row))];

  return (
    <div>
      {decks.length > 1 && (
        <div className="flex gap-2 mb-4 bg-white p-1 rounded-xl border border-slate-200 w-fit shadow-xs">
          {decks.map((d) => (
            <button 
              key={d} 
              type="button"
              onClick={() => setDeck(d)} 
              className={`px-4 py-1.5 text-xs font-black rounded-lg transition cursor-pointer ${
                deck === d ? "text-white shadow-xs" : "text-slate-600 hover:text-black"
              }`} 
              style={deck === d ? { background: primaryColor } : {}}
            >
              {d} Deck
            </button>
          ))}
        </div>
      )}

      {/* CHASSIS CONTAINER */}
      <div className="border-3 border-slate-300 rounded-3xl p-5 bg-white w-fit shadow-sm relative">
        <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-4 text-xs font-bold text-slate-400">
          <span className="flex items-center gap-1 text-[10px] uppercase font-black tracking-wider text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Front Door
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-slate-400">Windshield</span>
            <span className="text-xl" aria-label="Steering">🛞</span>
          </div>
        </div>

        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r} className="flex items-center gap-6">
              <div className="flex gap-2">
                {leftCols.map((c) => {
                  const s = deckSeats.find((x) => x.row === r && x.col === c);
                  return <SeatItem key={c} s={s} bus={bus} selected={selected} onToggleSeat={onToggleSeat} />;
                })}
              </div>
              <div className="w-5 flex items-center justify-center">
                <div className="h-6 w-0.5 bg-slate-200" />
              </div>
              <div className="flex gap-2">
                {rightCols.map((c) => {
                  const s = deckSeats.find((x) => x.row === r && x.col === c);
                  return <SeatItem key={c} s={s} bus={bus} selected={selected} onToggleSeat={onToggleSeat} />;
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-200 text-center text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest">
          Engine / Rear End
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-[11px] font-bold text-slate-600 mt-4">
        <span className="flex items-center gap-1.5"><i className="w-3.5 h-3.5 rounded-sm border-2 border-slate-300 bg-white" /> Available</span>
        <span className="flex items-center gap-1.5"><i className="w-3.5 h-3.5 rounded-sm border-2 border-emerald-600 bg-emerald-600" /> Selected</span>
        <span className="flex items-center gap-1.5"><i className="w-3.5 h-3.5 rounded-sm border-2 border-rose-300 bg-rose-50" /> Women Only</span>
        <span className="flex items-center gap-1.5"><i className="w-3.5 h-3.5 rounded-sm border-2 border-slate-300 bg-slate-200" /> Booked</span>
      </div>
    </div>
  );
}

function SeatItem({ s, bus, selected, onToggleSeat }) {
  if (!s) return <div className={bus.layout === "SLEEPER" ? "w-20 h-10" : "w-11 h-11"} />;
  
  const isSleeper = bus.layout === "SLEEPER";
  const sel = selected.includes(s.seatId);
  const taken = s.status === "Booked" || s.status === "Held";
  const mine = s.status === "HeldByMe";
  const ladies = s.genderRestriction === "FemaleOnly";

  if (isSleeper) {
    return (
      <button
        type="button"
        onClick={() => onToggleSeat(s)}
        disabled={taken}
        title={`${s.seatNumber} · ₹${s.price}`}
        className={`relative w-20 h-10 rounded-md border-2 transition-all duration-150 flex items-center justify-between px-2 text-left shadow-xs select-none cursor-pointer ${
          sel || mine
            ? "bg-emerald-600 border-emerald-700 text-white shadow-md scale-[1.03]"
            : taken
            ? "bg-slate-200 border-slate-300 text-slate-400 cursor-not-allowed opacity-75"
            : ladies
            ? "bg-rose-50 border-rose-300 text-rose-800 hover:border-rose-500"
            : "bg-white border-slate-300 text-slate-700 hover:border-[#D84E55]"
        }`}
      >
        <div className={`w-2.5 h-6 rounded-xs border ${sel || mine ? "bg-emerald-400/40 border-emerald-300" : "bg-slate-200/80 border-slate-300"}`} />
        <div className="flex flex-col">
          <span className="text-[10px] font-black tracking-tight leading-tight">{s.seatNumber}</span>
          <span className="text-[9px] font-mono opacity-90 leading-tight">₹{s.price}</span>
        </div>
        <div className={`w-1 h-2 rounded-full ${sel || mine ? "bg-white" : "bg-slate-300"}`} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onToggleSeat(s)}
      disabled={taken}
      title={`${s.seatNumber} · ₹${s.price}`}
      className={`relative w-11 h-11 rounded-lg border-2 transition-all duration-150 flex flex-col items-center justify-center shadow-xs select-none cursor-pointer ${
        sel || mine
          ? "bg-emerald-600 border-emerald-700 text-white shadow-md scale-[1.05]"
          : taken
          ? "bg-slate-200 border-slate-300 text-slate-400 cursor-not-allowed"
          : ladies
          ? "bg-rose-50 border-rose-300 text-rose-800 hover:border-rose-500"
          : "bg-white border-slate-300 text-slate-700 hover:border-[#D84E55]"
      }`}
    >
      <span className="text-[10px] font-black">{s.seatNumber}</span>
      <span className="text-[9px] font-mono opacity-80">₹{s.price}</span>
    </button>
  );
}