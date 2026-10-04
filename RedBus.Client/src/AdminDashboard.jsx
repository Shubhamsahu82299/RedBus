import React, { useState, useEffect } from "react";
import { 
  Settings, RefreshCw, Bus as BusIcon, Download, Search, 
  PlusCircle, ShieldCheck, IndianRupee, Users, CheckCircle2, 
  Clock, AlertCircle, ArrowRight, Trash2, Layers
} from "lucide-react";

export default function AdminDashboard({ apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:5279", onBackToApp }) {
  const [activeTab, setActiveTab] = useState("bookings"); // "bookings" | "create"
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Form State for Adding Fleet
  const [formData, setFormData] = useState({
    operatorName: "Shivnath Express Multi-Axle",
    registrationNumber: "CG-07-M-2026",
    layoutCategory: "SLEEPER",
    totalSeats: 24,
    sourceCity: "Raipur",
    destinationCity: "Indore",
    distanceKm: 650,
    departureTime: "17:00",
    arrivalTime: "08:00",
    baseFare: 1600
  });

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/admin/bookings`);
      if (res.ok) {
        const data = await res.json();
        setBookings(data);
      }
    } catch {
      // Backend not running or endpoint unreachable
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/admin/schedules/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create schedule.");

      alert("🎉 Bus chassis, route, and seat matrix provisioned successfully!");
      setActiveTab("bookings");
      fetchBookings();
    } catch (err) {
      alert(err.message || "Network error while provisioning schedule.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetDatabase = async () => {
    if (!window.confirm("⚠️ WARNING: This will wipe all current bookings and reset the database to default seed state. Proceed?")) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/admin/reset-database`, { method: "POST" });
      if (res.ok) {
        alert("Database cleanly wiped and reseeded!");
        fetchBookings();
      }
    } catch {
      alert("Error resetting database.");
    } finally {
      setLoading(false);
    }
  };
const handleCancelBooking = async (bookingId, pnr) => {
    if (!window.confirm(`Kya aap PNR: ${pnr} cancel and release the seats? This action is irreversible.`)) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/bookings/${bookingId}/cancel`, {
        method: "POST"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to cancel ticket.");
      
      alert(`✅ ${data.message}\nRefund Amount: ₹${data.refundAmount}`);
      fetchBookings(); // Table refresh
    } catch (err) {
      alert(err.message || "Error cancelling ticket.");
    } finally {
      setLoading(false);
    }
  };
  // KPIs
  const totalRevenue = bookings.reduce((sum, b) => b.status === "Confirmed" ? sum + (Number(b.farePaid) || 0) : sum, 0);
  const confirmedCount = bookings.filter(b => b.status === "Confirmed").length;
  const heldCount = bookings.filter(b => b.status === "Held").length;

  // Filtered Bookings
  const filteredBookings = bookings.filter(b => {
    const matchesSearch = 
      b.pnr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.passengerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.operatorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.seatNumbers.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "ALL" || b.status.toUpperCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#F4F5F7] text-slate-900 font-sans antialiased pb-12">
      
      {/* ADMIN SUB-NAVBAR */}
      <div className="bg-slate-900 text-white border-b border-slate-800 sticky top-15 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-[#D84E55] rounded-lg">
              <Settings className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-black text-sm tracking-wide">RED-PULSE OPERATIONS CONTROL</span>
              <span className="ml-2 text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700 font-mono">v2.4 Live</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handleResetDatabase} 
              disabled={loading}
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/30 flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Factory Reset DB
            </button>
            {onBackToApp && (
              <button 
                onClick={onBackToApp} 
                className="text-xs font-bold px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition border border-white/10"
              >
                Exit to Booking Portal →
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">

        {/* 1. ANALYTICS KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex justify-between items-start">
              <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Gross Revenue</span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><IndianRupee className="w-4 h-4" /></div>
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2">₹{totalRevenue.toLocaleString("en-IN")}</div>
            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3 h-3" /> Real-time settled
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex justify-between items-start">
              <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Confirmed Bookings</span>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><CheckCircle2 className="w-4 h-4" /></div>
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2">{confirmedCount}</div>
            <span className="text-[11px] font-bold text-slate-400 mt-1 block">Boarding passes issued</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex justify-between items-start">
              <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Active Holds (10m TTL)</span>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><Clock className="w-4 h-4" /></div>
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2">{heldCount}</div>
            <span className="text-[11px] font-bold text-amber-600 mt-1 block">Awaiting payment</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex justify-between items-start">
              <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Fleet Operators</span>
              <div className="p-2 bg-purple-50 text-purple-600 rounded-xl"><BusIcon className="w-4 h-4" /></div>
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2">4 Verified</div>
            <span className="text-[11px] font-bold text-purple-600 mt-1 block">Zingbus, IntrCity, VRL, Kanker</span>
          </div>
        </div>

        {/* 2. TABS SELECTOR */}
        <div className="flex items-center gap-3 border-b border-slate-200">
          <button 
            onClick={() => setActiveTab("bookings")}
            className={`pb-3 text-sm font-black border-b-2 transition flex items-center gap-2 ${
              activeTab === "bookings" 
                ? "border-[#D84E55] text-[#D84E55]" 
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Layers className="w-4 h-4" /> Live Passenger Ledger ({bookings.length})
          </button>

          <button 
            onClick={() => setActiveTab("create")}
            className={`pb-3 text-sm font-black border-b-2 transition flex items-center gap-2 ${
              activeTab === "create" 
                ? "border-[#D84E55] text-[#D84E55]" 
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <PlusCircle className="w-4 h-4" /> + Provision New Bus / Route
          </button>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: PASSENGER BOOKING LEDGER                           */}
        {/* ========================================================= */}
        {activeTab === "bookings" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-4">
            
            {/* SEARCH & FILTERS BAR */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search PNR, Passenger, Seat, or Bus..." 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-bold outline-none focus:border-[#D84E55] focus:bg-white transition"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <select 
                  value={statusFilter} 
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="CONFIRMED">Confirmed Only</option>
                  <option value="HELD">Held Only</option>
                </select>

                <button 
                  onClick={fetchBookings} 
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
                  title="Refresh Table"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            {/* TABLE */}
            {filteredBookings.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs font-bold">
                {bookings.length === 0 
                  ? "No bookings recorded yet. Book a seat from the customer portal to populate this ledger."
                  : "No bookings match your search query."}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-400 uppercase font-black text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">PNR</th>
                      <th className="py-3 px-4">Passenger Details</th>
                      <th className="py-3 px-4">Fleet / Registration</th>
                      <th className="py-3 px-4">Route</th>
                      <th className="py-3 px-4">Berth(s)</th>
                      <th className="py-3 px-4">Total Fare</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">E-Pass</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold">
                    {filteredBookings.map((b) => (
                      <tr key={b.bookingId} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-mono font-black text-[#D84E55]">{b.pnr}</td>
                        <td className="py-3 px-4">
                          <div className="font-black text-slate-900">{b.passengerName}</div>
                          <div className="text-[11px] text-slate-400 font-normal">{b.passengerPhone} • {b.passengerEmail}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-800">{b.operatorName}</div>
                          <div className="font-mono text-[10px] text-slate-400">{b.busNumber}</div>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-600">{b.source} ➔ {b.destination}</td>
                        <td className="py-3 px-4 font-black text-slate-900">{b.seatNumbers}</td>
                        <td className="py-3 px-4 font-black text-emerald-700">₹{b.farePaid}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                            b.status === "Confirmed" 
                              ? "bg-emerald-100 text-emerald-800" 
                              : "bg-amber-100 text-amber-800"
                          }`}>
                            {b.status}
                          </span>
                        </td>
                       
                        <td className="py-3 px-4 text-right">
  <div className="flex items-center justify-end gap-2">
    <a 
      href={`${apiBaseUrl}/api/tickets/${b.bookingId}/download`}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-black text-white text-[11px] font-black px-3 py-1.5 rounded-lg shadow-2xs transition"
    >
      <Download className="w-3 h-3" /> PDF
    </a>

    {/* Cancel Button */}
    {b.status !== "Cancelled" ? (
      <button
        onClick={() => handleCancelBooking(b.bookingId, b.pnr)}
        className="inline-flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition"
        title="Cancel Ticket & Release Seats"
      >
        <Trash2 className="w-3 h-3" /> Cancel
      </button>
    ) : (
      <span className="text-[10px] text-slate-400 font-bold px-2 py-1 bg-slate-100 rounded">
        Cancelled
      </span>
    )}
  </div>
</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: PROVISION NEW BUS CHASSIS & ROUTE                  */}
        {/* ========================================================= */}
        {activeTab === "create" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs max-w-3xl">
            <div className="border-b border-slate-100 pb-4 mb-5">
              <h3 className="font-black text-base text-slate-900">Fleet Provisioning Wizard</h3>
              <p className="text-xs text-slate-500 mt-0.5">Deploy new bus fleets, assign routes, and generate seat matrices directly to SQLite.</p>
            </div>

            <form onSubmit={handleCreateSchedule} className="space-y-4 text-xs font-bold">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 mb-1">Operator Brand Name</label>
                  <input 
                    value={formData.operatorName} 
                    onChange={(e) => setFormData({ ...formData, operatorName: e.target.value })}
                    required 
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-[#D84E55]"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Registration / Plate No</label>
                  <input 
                    value={formData.registrationNumber} 
                    onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                    required 
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono uppercase font-bold outline-none focus:border-[#D84E55]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 mb-1">Chassis / Cabin Layout</label>
                  <select 
                    value={formData.layoutCategory}
                    onChange={(e) => setFormData({ ...formData, layoutCategory: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold bg-white outline-none focus:border-[#D84E55]"
                  >
                    <option value="SLEEPER">A/C Sleeper (2+1 Upper & Lower Decks)</option>
                    <option value="SEATER">A/C Pushback Seater (2+2 Single Deck)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Chassis Capacity (Total Berths/Chairs)</label>
                  <input 
                    type="number"
                    value={formData.totalSeats} 
                    onChange={(e) => setFormData({ ...formData, totalSeats: Number(e.target.value) })}
                    required 
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-[#D84E55]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-500 mb-1">Origin City (Source)</label>
                  <input 
                    value={formData.sourceCity} 
                    onChange={(e) => setFormData({ ...formData, sourceCity: e.target.value })}
                    required 
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-[#D84E55]"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Destination City</label>
                  <input 
                    value={formData.destinationCity} 
                    onChange={(e) => setFormData({ ...formData, destinationCity: e.target.value })}
                    required 
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-[#D84E55]"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Base Ticket Fare (₹)</label>
                  <input 
                    type="number"
                    value={formData.baseFare} 
                    onChange={(e) => setFormData({ ...formData, baseFare: Number(e.target.value) })}
                    required 
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-[#D84E55] outline-none focus:border-[#D84E55]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 mb-1">Departure Time (24h HH:mm)</label>
                  <input 
                    value={formData.departureTime} 
                    onChange={(e) => setFormData({ ...formData, departureTime: e.target.value })}
                    placeholder="18:30"
                    required 
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none focus:border-[#D84E55]"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Arrival Time (24h HH:mm)</label>
                  <input 
                    value={formData.arrivalTime} 
                    onChange={(e) => setFormData({ ...formData, arrivalTime: e.target.value })}
                    placeholder="08:30"
                    required 
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none focus:border-[#D84E55]"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setActiveTab("bookings")}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="bg-[#D84E55] hover:bg-[#B93037] text-white font-black px-6 py-2.5 rounded-xl text-xs shadow-md transition disabled:opacity-50"
                >
                  {loading ? "Generating Chassis Matrix..." : "Deploy Schedule & Seats"}
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}