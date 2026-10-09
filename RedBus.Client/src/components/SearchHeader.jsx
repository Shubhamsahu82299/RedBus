import React from "react";
import { MapPin, ArrowLeftRight, Clock, Navigation } from "lucide-react";

export default function SearchHeader({ 
  source, 
  setSource, 
  destination, 
  setDestination, 
  date, 
  setDate, 
  availableRoutes = [],
  onSearch, 
  searching,
  primaryColor = "#D84E55" 
}) {
  const swapCities = () => {
    const temp = source;
    setSource(destination);
    setDestination(temp);
  };

  // Distinct origin cities available in DB
  const distinctSources = Array.from(new Set(availableRoutes.map(r => r.from)));
  
  // Destination cities linked to selected source
  const validDestinations = Array.from(
    new Set(
      availableRoutes
        .filter(r => r.from.toLowerCase() === source.trim().toLowerCase())
        .map(r => r.to)
    )
  );

  return (
    <section className="bg-gradient-to-b from-white to-slate-50 border-b border-slate-200 py-4 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_1fr_auto] gap-2.5 items-center">
        
        {/* FROM INPUT WITH DATALIST / AUTOCOMPLETE */}
        <label className="bg-white border border-slate-300 rounded-xl px-3.5 py-2 flex items-center gap-2.5 shadow-2xs hover:border-slate-400 focus-within:border-[#D84E55] transition">
          <MapPin className="w-4 h-4 text-slate-400" />
          <div className="flex-1">
            <span className="block text-[9px] uppercase font-black text-slate-400">From</span>
            <input 
              list="sources-list"
              value={source} 
              onChange={(e) => setSource(e.target.value)} 
              className="w-full outline-none text-sm font-bold text-slate-900" 
              placeholder="Source City"
            />
            <datalist id="sources-list">
              {distinctSources.map((city) => (
                <option key={city} value={city} />
              ))}
            </datalist>
          </div>
        </label>

        {/* SWAP BUTTON */}
        <button 
          type="button"
          onClick={swapCities}
          className="mx-auto p-2.5 bg-white border border-slate-300 rounded-full hover:bg-slate-50 transition shadow-2xs cursor-pointer active:scale-90" 
          aria-label="Swap cities"
        >
          <ArrowLeftRight className="w-4 h-4 text-slate-600" />
        </button>

        {/* TO INPUT WITH LINKED DESTINATIONS */}
        <label className="bg-white border border-slate-300 rounded-xl px-3.5 py-2 flex items-center gap-2.5 shadow-2xs hover:border-slate-400 focus-within:border-[#D84E55] transition">
          <Navigation className="w-4 h-4 text-slate-400" />
          <div className="flex-1">
            <span className="block text-[9px] uppercase font-black text-slate-400">To</span>
            <input 
              list="destinations-list"
              value={destination} 
              onChange={(e) => setDestination(e.target.value)} 
              className="w-full outline-none text-sm font-bold text-slate-900" 
              placeholder="Destination City"
            />
            <datalist id="destinations-list">
              {validDestinations.map((city) => (
                <option key={city} value={city} />
              ))}
            </datalist>
          </div>
        </label>

        {/* DYNAMIC DATE */}
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

        {/* SEARCH BUTTON */}
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