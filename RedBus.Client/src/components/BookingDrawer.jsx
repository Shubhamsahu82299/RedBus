import React from "react";
import { Timer, Download, CheckCircle2, ShieldCheck, X, User } from "lucide-react";

export default function BookingDrawer({
  bus,
  step,
  setStep,
  chosenSeats,
  baseTotal,
  discount,
  coupon,
  insurance,
  setInsurance,
  insCost,
  gst,
  grandTotal,
  bp,
  setBp,
  dp,
  setDp,
  p,
  setP,
  passengers = [],
  onPassengerChange,
  validPassenger,
  busy,
  onHoldSeats,
  booking,
  paid,
  timeLeft,
  fmtTime,
  onPay,
  toast,
  setToast,
  apiBaseUrl,
  primaryColor = "#D84E55"
}) {
  return (
    <div className="space-y-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs h-fit">
      
      {/* STEPPER */}
      <ol className="flex gap-2 text-xs font-black border-b border-slate-100 pb-3">
        {["Seat Selection", "Boarding & Dropping", "Review & Pay"].map((label, i) => (
          <li 
            key={label} 
            className={`px-2.5 py-1 rounded-lg transition ${
              step === i + 1 ? "text-white" : "bg-slate-100 text-slate-500"
            }`} 
            style={step === i + 1 ? { background: primaryColor } : {}}
          >
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      {/* FARE BREAKDOWN */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs font-bold text-slate-700">
        <div className="flex justify-between">
          <span className="text-slate-500">Selected Berth(s):</span>
          <span className="font-black text-slate-900">{chosenSeats.map((s) => s.seatNumber).join(", ") || "None"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Base Fare:</span>
          <span>₹{baseTotal}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-emerald-700">
            <span>Coupon ({coupon}):</span>
            <span>−₹{discount}</span>
          </div>
        )}
        {insurance && chosenSeats.length > 0 && (
          <div className="flex justify-between text-slate-600">
            <span>Travel Insurance:</span>
            <span>₹{insCost}</span>
          </div>
        )}
        <div className="flex justify-between text-slate-500">
          <span>GST (5%):</span>
          <span>₹{gst}</span>
        </div>
        <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-black text-slate-900">
          <span>Total Amount:</span>
          <span style={{ color: primaryColor }}>₹{grandTotal}</span>
        </div>
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <button 
          type="button"
          disabled={!chosenSeats.length} 
          onClick={() => setStep(2)} 
          className="w-full text-white font-black py-3 rounded-xl disabled:bg-slate-300 shadow-md transition hover:brightness-105 active:scale-98 cursor-pointer" 
          style={{ background: primaryColor }}
        >
          Continue to Boarding Points →
        </button>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-700">
            Boarding Location & Time
            <select 
              value={bp} 
              onChange={(e) => setBp(e.target.value)} 
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 mt-1 text-xs font-semibold bg-white outline-none"
            >
              {(bus.bps || []).map((x) => (
                <option key={x.id} value={x.id}>{x.time} • {x.name} ({x.landmark || "Point"})</option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-bold text-slate-700">
            Dropping Location & Time
            <select 
              value={dp} 
              onChange={(e) => setDp(e.target.value)} 
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 mt-1 text-xs font-semibold bg-white outline-none"
            >
              {(bus.dps || []).map((x) => (
                <option key={x.id} value={x.id}>{x.time} • {x.name}</option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl cursor-pointer">
            <input 
              type="checkbox" 
              checked={insurance} 
              onChange={(e) => setInsurance(e.target.checked)} 
              className="rounded accent-emerald-600 w-4 h-4" 
            />
            <div className="text-xs">
              <span className="font-black text-emerald-900 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Add Trip Insurance @ ₹19/passenger
              </span>
              <span className="text-[10px] text-emerald-700">Covers baggage loss, accident & delay compensation.</span>
            </div>
          </label>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setStep(1)} className="px-4 py-2.5 border border-slate-300 rounded-xl font-bold text-xs hover:bg-slate-50 cursor-pointer">Back</button>
            <button type="button" onClick={() => setStep(3)} className="flex-1 text-white font-black py-2.5 rounded-xl shadow-md transition hover:brightness-105 cursor-pointer" style={{ background: primaryColor }}>
              Enter Passenger Details →
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <div className="space-y-4">
          {!booking && (
            <div className="space-y-4">
              
              {/* CONTACT DETAILS HEADER */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Contact Details (Ticket Delivery)</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input 
                    placeholder="Email Address" 
                    value={p.email} 
                    onChange={(e) => setP({ ...p, email: e.target.value })} 
                    className="border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold outline-none bg-white focus:border-[#D84E55]" 
                  />
                  <input 
                    placeholder="Mobile (10 digits)" 
                    inputMode="numeric" 
                    maxLength={10} 
                    value={p.phone} 
                    onChange={(e) => setP({ ...p, phone: e.target.value.replace(/\D/g, "") })} 
                    className="border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold outline-none bg-white focus:border-[#D84E55]" 
                  />
                </div>
              </div>

              {/* INDIVIDUAL PASSENGER DETAILS LIST */}
              <div className="space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Passenger Information ({passengers.length || chosenSeats.length} Berth{(passengers.length || chosenSeats.length) > 1 ? "s" : ""})
                </span>

                {passengers.length > 0 ? (
                  passengers.map((pas, idx) => (
                    <div key={pas.seatId || idx} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5">
                      <div className="flex justify-between items-center pb-1.5 border-b border-slate-200">
                        <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-[#D84E55]" /> Passenger {idx + 1}
                        </span>
                        <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[#D84E55]">
                          Seat: {pas.seatNumber}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-[1.5fr_0.8fr] gap-2">
                        <input 
                          placeholder="Full Name" 
                          value={pas.name} 
                          onChange={(e) => onPassengerChange(idx, "name", e.target.value)} 
                          className="border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold outline-none bg-white focus:border-[#D84E55]" 
                        />
                        <div className="grid grid-cols-2 gap-1.5">
                          <input 
                            placeholder="Age" 
                            type="number" 
                            min="1" 
                            max="120"
                            value={pas.age || ""} 
                            onChange={(e) => onPassengerChange(idx, "age", e.target.value)} 
                            className="border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-bold outline-none bg-white focus:border-[#D84E55]" 
                          />
                          <select 
                            value={pas.gender} 
                            onChange={(e) => onPassengerChange(idx, "gender", e.target.value)}
                            className="border border-slate-300 rounded-xl px-2 py-2 text-xs font-bold outline-none bg-white focus:border-[#D84E55]"
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  // Fallback agar single passenger state ho
                  <div className="space-y-2">
                    <input 
                      placeholder="Full Passenger Name" 
                      value={p.name} 
                      onChange={(e) => setP({ ...p, name: e.target.value })} 
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold outline-none" 
                    />
                    <div className="grid grid-cols-2 gap-2">
                      {["Male", "Female"].map((g) => (
                        <button 
                          key={g} 
                          type="button"
                          onClick={() => setP({ ...p, gender: g })} 
                          className={`py-2 rounded-xl border text-xs font-black transition cursor-pointer ${
                            p.gender === g ? "text-white border-transparent" : "border-slate-300 text-slate-700"
                          }`} 
                          style={p.gender === g ? { background: primaryColor } : {}}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setStep(2)} className="px-4 py-2.5 border border-slate-300 rounded-xl font-bold text-xs hover:bg-slate-50 cursor-pointer">Back</button>
                <button 
                  type="button"
                  disabled={!validPassenger || busy} 
                  onClick={onHoldSeats} 
                  className="flex-1 text-white font-black py-2.5 rounded-xl disabled:bg-slate-300 shadow-md transition hover:brightness-105 active:scale-98 cursor-pointer" 
                  style={{ background: primaryColor }}
                >
                  {busy ? "Locking Berths..." : `Hold Seats • ₹${grandTotal}`}
                </button>
              </div>
            </div>
          )}

          {booking && !paid && (
            <div className="border border-amber-300 bg-amber-50 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 text-xs font-black text-amber-900">
                  <Timer className="w-4 h-4 text-amber-600 animate-spin" /> Berth Locked For You
                </span>
                <span className="font-mono text-lg font-black" style={{ color: primaryColor }}>{fmtTime(timeLeft)}</span>
              </div>
              <button 
                type="button"
                disabled={busy} 
                onClick={onPay} 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-xl shadow-md transition active:scale-98 cursor-pointer"
              >
                {busy ? "Authorizing Payment..." : `Confirm Payment • ₹${booking.totalAmount ?? grandTotal}`}
              </button>
            </div>
          )}

          {paid && (
            <div className="space-y-4">
              <div className="bg-emerald-600 text-white p-4 rounded-2xl shadow-md text-center">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-1" />
                <h4 className="font-black text-sm">Booking Confirmed!</h4>
                <p className="text-[11px] opacity-90">E-Ticket & Boarding QR Pass Generated</p>
              </div>

              <div className="bg-white border-2 border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
                <div className="flex justify-between items-start border-b border-dashed border-slate-300 pb-3">
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase">Boarding Pass</span>
                    <div className="font-black text-sm text-slate-900">{bus.operator}</div>
                    <div className="text-[10px] font-mono text-slate-500 font-bold">{bus.busNumber}</div>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded">VALID</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                  <div>
                    <span className="text-[9px] text-slate-400 block">Passenger(s)</span>
                    <span className="text-slate-900">
                      {passengers.length > 0 ? passengers.map(ps => ps.name).filter(Boolean).join(", ") : p.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-slate-400 block">Seat Number(s)</span>
                    <span className="text-sm font-black text-[#D84E55]">{chosenSeats.map(s => s.seatNumber).join(", ")}</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-300 pt-3 flex gap-2">
                  <a 
                    href={`${apiBaseUrl}/api/tickets/${booking.bookingId}/download`} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-black rounded-xl transition shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" /> Download PDF Ticket
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {toast && (
        <div role="alert" className="flex justify-between items-start gap-2 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl p-3">
          <span>{toast}</span>
          <button type="button" onClick={() => setToast("")} aria-label="Dismiss"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}
    </div>
  );
}