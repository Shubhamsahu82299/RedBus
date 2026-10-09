import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Star, CheckCircle2, Settings, Sparkles, Bus as BusIcon } from "lucide-react";
import confetti from "canvas-confetti";

import SearchHeader from "./components/SearchHeader";
import FilterSidebar from "./components/FilterSidebar";
import BusChassisView from "./components/BusChassisView";
import BookingDrawer from "./components/BookingDrawer";
import AdminDashboard from "./AdminDashboard";

const API = import.meta.env.VITE_API_URL || "http://localhost:5279";
const MAX_SEATS = 6;
const RED = "#D84E55";

// Aaj ki dynamic local date (YYYY-MM-DD)
const getTodayDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const playSound = (type) => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "select") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === "success") {
      const now = ctx.currentTime;
      osc.type = "triangle";
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.1);
      osc.frequency.setValueAtTime(783.99, now + 0.2);
      osc.frequency.setValueAtTime(1046.50, now + 0.3);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    }
  } catch {}
};

function layoutSeats(raw, layout) {
  const cols = layout === "SLEEPER" ? [1, 3, 4] : [1, 2, 4, 5];
  const byDeck = {};
  raw.forEach((s) => (byDeck[s.deck] ||= []).push(s));
  return Object.values(byDeck).flatMap((list) =>
    list.map((s, i) => ({ ...s, row: Math.floor(i / cols.length), col: cols[i % cols.length] }))
  );
}

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export default function App() {
  const [viewMode, setViewMode] = useState("customer");
  
  // Search state - Auto current date
  const [source, setSource] = useState("Raipur");
  const [destination, setDestination] = useState("Nagpur");
  const [date, setDate] = useState(getTodayDate);
  const [searching, setSearching] = useState(false);
  const [busesList, setBusesList] = useState([]);
  const [availableRoutes, setAvailableRoutes] = useState([]);

  // Filters & sorting
  const [filters, setFilters] = useState({ ac: false, sleeper: false, seater: false, primo: false });
  const [sort, setSort] = useState("dep");
  const [openId, setOpenId] = useState(null);

  // Seat chassis & booking
  const [seats, setSeats] = useState([]);
  const [deck, setDeck] = useState("Lower");
  const [selected, setSelected] = useState([]);
  const [step, setStep] = useState(1);
  const [bp, setBp] = useState("");
  const [dp, setDp] = useState("");
  const [insurance, setInsurance] = useState(true);
  const [coupon] = useState("SAVER120");
  
  // Contact details
  const [p, setP] = useState({
  name: "",
  email: "",
  phone: "",
  gender: "Male"
});
  // Multiple Passengers state per selected seat
  const [passengers, setPassengers] = useState([]);

  const [booking, setBooking] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [paid, setPaid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

 
useEffect(() => {
  setPassengers((prev) => {
    return selected.map((seatId, idx) => {
      const existing = prev.find((item) => item.seatId === seatId);
      const seatObj = seats.find((s) => s.seatId === seatId);
      const seatNum = seatObj ? seatObj.seatNumber : `Seat ${idx + 1}`;

      return (
        existing || {
          seatId,
          seatNumber: seatNum,
          name: "",
          gender: "Male",
          age: "",
        }
      );
    });
  });
}, [selected, seats]);

  const handlePassengerChange = (index, field, value) => {
    setPassengers((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // 1. Fetch all DB active routes on load
  useEffect(() => {
    async function loadRoutes() {
      try {
        const r = await fetch(`${API}/api/schedules/search`);
        if (r.ok) {
          const data = await r.json();
          const routeMap = [];
          data.forEach(item => {
            if (item.from && item.to) {
              routeMap.push({ from: item.from, to: item.to });
            }
          });
          if (routeMap.length > 0) {
            setAvailableRoutes(routeMap);
          }
        }
      } catch {}
    }
    loadRoutes();
  }, []);

  // 2. Geolocation based origin detection
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            );
            const geo = await res.json();
            const detectedCity = geo.address?.city || geo.address?.state_district || geo.address?.town;
            if (detectedCity) {
              setSource(detectedCity);
            }
          } catch {}
        },
        () => {},
        { timeout: 8000 }
      );
    }
  }, []);

  // 3. Whenever 'source' changes, dynamically adjust 'destination' to match routes in DB
  useEffect(() => {
    if (availableRoutes.length > 0) {
      const matchingTo = availableRoutes
        .filter(r => r.from.toLowerCase() === source.trim().toLowerCase())
        .map(r => r.to);

      if (matchingTo.length > 0 && !matchingTo.includes(destination)) {
        setDestination(matchingTo[0]);
      }
    }
  }, [source, availableRoutes]);

  // Live Database Search
  const handleSearch = useCallback(async () => {
    setSearching(true);
    setOpenId(null);
    try {
      const res = await fetch(`${API}/api/schedules/search?from=${encodeURIComponent(source.trim())}&to=${encodeURIComponent(destination.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setBusesList(data);
      } else {
        setBusesList([]);
      }
    } catch {
      setBusesList([]);
    } finally {
      setSearching(false);
    }
  }, [source, destination]);

  useEffect(() => {
    handleSearch();
  }, [handleSearch]);

  const buses = useMemo(() => {
    let l = busesList.filter((b) => 
      (!filters.ac || b.ac) && 
      (!filters.sleeper || b.layout === "SLEEPER") && 
      (!filters.seater || b.layout === "SEATER") &&
      (!filters.primo || b.primo)
    );
    const key = { dep: (b) => b.dep, price: (b) => b.base, rating: (b) => -b.rating }[sort];
    return [...l].sort((a, b) => (key(a) > key(b) ? 1 : -1));
  }, [busesList, filters, sort]);

  const activeBus = busesList.find((b) => b.scheduleId === openId);

  const resetSelection = () => { 
    setSelected([]); 
    setPassengers([]);
    setStep(1); 
    setBooking(null); 
    setPaid(false); 
    setToast(""); 
  };

  const openBus = async (b) => {
    if (openId === b.scheduleId) { setOpenId(null); return; }
    resetSelection();
    setOpenId(b.scheduleId); 
    setBp(b.bps?.[0]?.id || "bp1"); 
    setDp(b.dps?.[0]?.id || "dp1"); 
    setDeck("Lower"); 
    setSeats([]);

    try {
      const r = await fetch(`${API}/api/schedules/${b.scheduleId}/seats`);
      if (!r.ok) throw new Error("Seat fetch failed");
      setSeats(layoutSeats(await r.json(), b.layout));
    } catch {
      setToast("Could not fetch seat matrix for this bus.");
    }
  };

  const toggleSeat = (s) => {
    if (booking) return;
    if (s.status !== "Available" && s.status !== "FemaleOnly") return;
    if (s.genderRestriction === "FemaleOnly" && p.gender === "Male") {
      setToast("This seat is reserved for female passengers.");
      return;
    }
    setToast("");
    playSound("select");

    if (selected.includes(s.seatId)) {
      setSelected(selected.filter((i) => i !== s.seatId));
    } else {
      if (selected.length >= MAX_SEATS) {
        setToast(`Limit reached: Maximum ${MAX_SEATS} seats allowed.`);
        return;
      }
      setSelected([...selected, s.seatId]);
    }
  };

  const chosenSeats = seats.filter((s) => selected.includes(s.seatId));
  const baseTotal = chosenSeats.reduce((a, s) => a + s.price, 0);
  const discount = coupon === "SAVER120" && baseTotal > 0 ? 120 : 0;
  const insCost = insurance && chosenSeats.length > 0 ? chosenSeats.length * 19 : 0;
  const taxable = Math.max(0, baseTotal - discount);
  const gst = Math.round(taxable * 0.05);
  const grandTotal = taxable + gst + insCost;

  const holdSeats = async () => {
    setBusy(true); setToast("");
    const selectedBpObj = activeBus.bps?.find(x => x.id === bp) || activeBus.bps?.[0] || { name: `${activeBus.from} Stand`, landmark: "Main Gate", time: activeBus.dep };
    const selectedDpObj = activeBus.dps?.find(x => x.id === dp) || activeBus.dps?.[0] || { name: `${activeBus.to} Stand`, landmark: "Terminal", time: activeBus.arr };

    const seatNumbersStr = passengers.map(ps => ps.seatNumber).join(", ");
    const primaryPassengerName = passengers[0]?.name || p.name;
    const primaryPassengerGender = passengers[0]?.gender || p.gender;

    try {
      const r = await fetch(`${API}/api/bookings/hold`, {
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          scheduleId: activeBus.scheduleId, 
          userId: 1, 
          seatIds: selected, 
          passengerName: primaryPassengerName,
          passengerEmail: p.email, 
          passengerPhone: p.phone, 
          passengerGender: primaryPassengerGender,
          seatNumbers: seatNumbersStr,
          passengers: passengers,
          boardingPointName: selectedBpObj.name,
          boardingLandmark: selectedBpObj.landmark || "Platform 1",
          boardingTime: selectedBpObj.time || activeBus.dep,
          droppingPointName: selectedDpObj.name,
          droppingLandmark: selectedDpObj.landmark || "City Center",
          droppingTime: selectedDpObj.time || activeBus.arr
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setToast(d.message || "Failed to hold seats.");
        return;
      }
      setBooking({ bookingId: d.bookingId, expiresAt: new Date(d.expiresAt).getTime(), totalAmount: grandTotal });
      setSeats((prev) => prev.map((s) => (selected.includes(s.seatId) ? { ...s, status: "HeldByMe" } : s)));
    } catch {
      setToast("Network error holding seats.");
    } finally { setBusy(false); }
  };

  useEffect(() => {
    if (!booking || paid) return;
    const tick = () => {
      const left = Math.max(0, Math.round((booking.expiresAt - Date.now()) / 1000));
      setTimeLeft(left);
      if (left === 0) { 
        setBooking(null);
        setSelected([]);
        setPassengers([]);
        setStep(1);
        setToast("Hold expired."); 
      }
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [booking, paid]);

  const confirmPay = async () => {
    setBusy(true); setToast("");
    try {
      const r = await fetch(`${API}/api/payments/confirm`, {
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.bookingId, paymentReference: null }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return setToast(d.message || "Payment declined.");
      
      setPaid(true);
      playSound("success");
      setSeats((prev) => prev.map((s) => (selected.includes(s.seatId) ? { ...s, status: "Booked" } : s)));
      confetti({ particleCount: 160, spread: 90, origin: { y: 0.55 } });
    } catch { 
      setToast("Payment service offline."); 
    } finally { setBusy(false); }
  };

  // Validation: Phone, Email aur Har Passenger ka Name check
  const allPassengersValid = passengers.length > 0 && passengers.every((pas) => pas.name.trim().length > 1);
  const validPassenger = allPassengersValid && /^[6-9]\d{9}$/.test(p.phone) && /\S+@\S+\.\S+/.test(p.email);

  return (
    <div className="min-h-screen bg-[#F4F5F7] text-slate-900 font-sans antialiased selection:bg-[#D84E55] selection:text-white">
      
      {/* NAVBAR */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-xs backdrop-blur-md bg-white/95">
        <div className="max-w-6xl mx-auto px-4 h-15 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setViewMode("customer")}>
            <span className="h-9 w-9 rounded-xl text-white flex items-center justify-center font-black text-lg shadow-sm" style={{ background: RED }}>r</span>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight leading-none" style={{ color: RED }}>redBus</span>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-0.5">Enterprise Pulse</span>
            </div>
          </div>

          {/* SINGLE DEDICATED TOGGLE BUTTON */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setViewMode(viewMode === "customer" ? "admin" : "customer")} 
              className="flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl border border-slate-300 hover:border-slate-400 bg-white transition shadow-xs cursor-pointer active:scale-95"
            >
              {viewMode === "admin" ? (
                <>
                  <BusIcon className="w-4 h-4 text-[#D84E55]" />
                  <span>Customer Portal</span>
                </>
              ) : (
                <>
                  <Settings className="w-4 h-4 text-slate-600" />
                  <span>Admin Operations</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {viewMode === "customer" ? (
        <>
          {/* SEARCH HEADER COMPONENT */}
          <SearchHeader 
            source={source}
            setSource={setSource}
            destination={destination}
            setDestination={setDestination}
            date={date}
            setDate={setDate}
            availableRoutes={availableRoutes}
            onSearch={handleSearch}
            searching={searching}
            primaryColor={RED}
          />

          <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
            
            {/* FILTER SIDEBAR COMPONENT */}
            <FilterSidebar filters={filters} setFilters={setFilters} />

            <main className="space-y-4">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
                <span>Showing {buses.length} Buses • {source} ➔ {destination}</span>
                <span className="flex gap-4">Sort:
                  {[["dep", "Departure"], ["price", "Fare"], ["rating", "Rating"]].map(([k, label]) => (
                    <button key={k} onClick={() => setSort(k)} className={`cursor-pointer ${sort === k ? "text-[#D84E55] font-black underline underline-offset-4" : "hover:text-black"}`}>{label}</button>
                  ))}
                </span>
              </div>

              {buses.length === 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-xs font-bold text-slate-400">
                  No buses found operating between {source} and {destination}. Add one from the Admin Console!
                </div>
              )}

              {buses.map((b) => {
                const isOpen = openId === b.scheduleId;
                return (
                  <article key={b.scheduleId} className={`bg-white rounded-2xl border transition-all duration-200 shadow-xs ${isOpen ? "border-[#D84E55] ring-2 ring-[#D84E55]/10" : "border-slate-200 hover:border-slate-300"}`}>
                    
                    <div className="p-5 grid grid-cols-1 lg:grid-cols-[1.5fr_1.3fr_auto] gap-6 items-center">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-black text-base text-slate-900">{b.operator}</h3>
                          {b.primo && <span className="bg-amber-100 border border-amber-300 text-amber-800 text-[10px] font-black px-1.5 py-0.5 rounded uppercase">PRIMO</span>}
                          <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 font-bold">{b.busNumber}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{b.busType}</p>
                        <div className="flex items-center gap-2 mt-2.5">
                          <span className="inline-flex items-center gap-1 bg-emerald-600 text-white text-xs font-black px-2 py-0.5 rounded-md shadow-2xs">
                            <Star className="w-3 h-3 fill-current" />{b.rating}
                          </span>
                          <span className="text-xs text-slate-400 font-semibold">{b.reviews?.toLocaleString("en-IN") || 120} ratings</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-5 text-sm bg-slate-50/80 border border-slate-100 p-3 rounded-xl">
                        <div>
                          <div className="font-black text-lg text-slate-900">{b.dep}</div>
                          <div className="text-[11px] font-bold text-slate-500">{b.from}</div>
                        </div>
                        <div className="flex-1 flex flex-col items-center">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{b.duration || "Direct"}</span>
                          <div className="w-full flex items-center gap-1 my-0.5">
                            <div className="h-0.5 flex-1 bg-slate-300" />
                            <div className="w-2 h-2 rounded-full border-2 border-[#D84E55] bg-white" />
                            <div className="h-0.5 flex-1 bg-slate-300" />
                          </div>
                          <span className="text-[9px] text-emerald-700 font-bold">Express Route</span>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-lg text-slate-900">{b.arr}</div>
                          <div className="text-[11px] font-bold text-slate-500">{b.to}</div>
                        </div>
                      </div>

                      <div className="text-right flex flex-col items-end justify-center">
                        <div className="text-[10px] font-bold uppercase text-slate-400">Starting from</div>
                        <div className="text-2xl font-black text-slate-900">₹{b.base}</div>
                        <button 
                          onClick={() => openBus(b)} 
                          className="mt-2 text-white text-xs font-black px-6 py-2.5 rounded-xl shadow-xs transition hover:brightness-105 active:scale-95 cursor-pointer" 
                          style={{ background: isOpen ? "#334155" : RED }}
                        >
                          {isOpen ? "Close Cabins" : "Select Seats"}
                        </button>
                      </div>
                    </div>

                    <div className="px-5 pb-3 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-600 border-t border-slate-100 pt-2.5 bg-slate-50/50 rounded-b-2xl">
                      {(b.amenities || ["Wi-Fi", "Charging Port", "Water Bottle"]).map((a) => (
                        <span key={a} className="bg-white border border-slate-200 rounded-md px-2 py-0.5 flex items-center gap-1 shadow-2xs">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />{a}
                        </span>
                      ))}
                    </div>

                    {isOpen && (
                      <div className="border-t border-slate-200 p-6 bg-slate-50/50 grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-8">
                        
                        {/* 3D BUS CHASSIS VIEW COMPONENT */}
                        <BusChassisView 
                          bus={b}
                          seats={seats}
                          deck={deck}
                          setDeck={setDeck}
                          selected={selected}
                          onToggleSeat={toggleSeat}
                          primaryColor={RED}
                        />

                        {/* STEP-BY-STEP BOOKING DRAWER COMPONENT */}
                        <BookingDrawer 
                          bus={b}
                          step={step}
                          setStep={setStep}
                          chosenSeats={chosenSeats}
                          baseTotal={baseTotal}
                          discount={discount}
                          coupon={coupon}
                          insurance={insurance}
                          setInsurance={setInsurance}
                          insCost={insCost}
                          gst={gst}
                          grandTotal={grandTotal}
                          bp={bp}
                          setBp={setBp}
                          dp={dp}
                          setDp={setDp}
                          p={p}
                          setP={setP}
                          passengers={passengers}
                          onPassengerChange={handlePassengerChange}
                          validPassenger={validPassenger}
                          busy={busy}
                          onHoldSeats={holdSeats}
                          booking={booking}
                          paid={paid}
                          timeLeft={timeLeft}
                          fmtTime={fmt}
                          onPay={confirmPay}
                          toast={toast}
                          setToast={setToast}
                          apiBaseUrl={API}
                          primaryColor={RED}
                        />

                      </div>
                    )}
                  </article>
                );
              })}
            </main>
          </div>
        </>
      ) : (
        <AdminDashboard 
          apiBaseUrl={API} 
          onBackToApp={() => {
            setViewMode("customer");
            handleSearch();
          }} 
        />
      )}

    </div>
  );
}