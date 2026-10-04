import React from "react";

export default function FilterSidebar({ filters, setFilters }) {
  const options = [
    ["primo", "Primo Luxury Only"],
    ["ac", "A/C Bus Only"], 
    ["sleeper", "Sleeper Cabins"], 
    ["seater", "Pushback Seater"]
  ];

  return (
    <aside className="bg-white rounded-2xl border border-slate-200 p-5 h-fit text-sm space-y-4 shadow-xs">
      <div className="font-black text-slate-900 uppercase text-xs tracking-wider flex items-center justify-between">
        <span>Filter Buses</span>
        <button 
          onClick={() => setFilters({ ac: false, sleeper: false, seater: false, primo: false })}
          className="text-[10px] text-slate-400 hover:text-red-500 cursor-pointer"
        >
          Clear
        </button>
      </div>
      <div className="space-y-2.5 font-semibold text-slate-700 text-xs">
        {options.map(([k, label]) => (
          <label key={k} className="flex items-center gap-2.5 cursor-pointer hover:text-black">
            <input 
              type="checkbox" 
              checked={filters[k]} 
              onChange={(e) => setFilters({ ...filters, [k]: e.target.checked })} 
              className="rounded accent-[#D84E55] w-4 h-4 cursor-pointer" 
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </aside>
  );
}