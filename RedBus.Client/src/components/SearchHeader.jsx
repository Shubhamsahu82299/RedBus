import React from "react";
import { MapPin, ArrowLeftRight, Clock } from "lucide-react";

export default function SearchHeader({ 
  source, 
  setSource, 
  destination, 
  setDestination, 
  date, 
  setDate, 
  onSearch, 
  searching,
  primaryColor = "#D84E55" 
}) {
  const swapCities = () => {
    const temp = source;
    setSource(destination);
    setDestination(temp);
  };

  return (
    <section className="bg-gradient-to-b from-white to-slate-50 border-b border-slate-200 py-4 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_1fr_auto] gap-2.5 items-center">
        <label className="bg-white border border-slate-300 rounded-xl px-3.5 py-2 flex items-center gap-2.5 shadow-2xs hover:border-slate-400 focus-within:border-[#D84E55] transition">
          <MapPin className="w-4 h-4 text-slate-400" />
          <div className="flex-1">
            <span className="block text-[9px] uppercase font-black text-slate-400">From</span>
            <input 
              value={source} 
              onChange={(e) => setSource(e.target.value)} 
              className="w-full outline-none text-sm font-bold text-slate-900" 
              placeholder="Source City"
            />
          </div>
        </label>

        <button 
          type="button"
          onClick={swapCities}
          className="mx-auto p-2.5 bg-white border border-slate-300 rounded-full hover:bg-slate-50 transition shadow-2xs cursor-pointer active:scale-90" 
          aria-label="Swap cities"
        >
          <ArrowLeftRight className="w-4 h-4 text-slate-600" />
        </button>

        <label className="bg-white border border-slate-300 rounded-xl px-3.5 py-2 flex items-center gap-2.5 shadow-2xs hover:border-slate-400 focus-within:border-[#D84E55] transition">
          <MapPin className="w-4 h-4 text-slate-400" />
          <div className="flex-1">
            <span className="block text-[9px] uppercase font-black text-slate-400">To</span>
            <input 
              value={destination} 
              onChange={(e) => setDestination(e.target.value)} 
              className="w-full outline-none text-sm font-bold text-slate-900" 
              placeholder="Destination City"
            />
          </div>
        </label>

        <label className="bg-white border border-slate-300 rounded-xl px-3.5 py-2 flex items-center gap-2.5 shadow-2xs hover:border-slate-400 transition">
          <Clock className="w-4 h-4 text-slate-400" />
          <div className="flex-1">
            <span className="block text-[9px] uppercase font-black text-slate-400">Date of Journey</span>
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              className="w-full outline-none text-sm font-bold text-slate-900 bg-transparent" 
            />
          </div>
        </label>

        <button 
          type="button"
          onClick={onSearch}
          disabled={searching}
          className="h-full text-white font-black text-sm px-8 py-3 rounded-xl shadow-md transition hover:brightness-105 active:scale-98 disabled:opacity-50 cursor-pointer" 
          style={{ background: primaryColor }}
        >
          {searching ? "Searching..." : "Search Buses"}
        </button>
      </div>
    </section>
  );
}