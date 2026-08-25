import React, { useState, useEffect } from "react";
import {
  Utensils,
  History,
  PieChart,
  Lock,
  Unlock,
  Plus,
  Trash2,
  CheckCircle,
  Key,
  Receipt,
  Printer,
  X,
  Sparkles,
  Wallet,
  Smartphone,
  Tag,
  Wifi,
  WifiOff,
  ShieldCheck,
} from "lucide-react";

const RESTAURANT_NAME = "My Restaurant";
const DEFAULT_PIN = "1234";

export default function App() {
  const [activeTab, setActiveTab] = useState("new-sale");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");

  const [ownerPin, setOwnerPin] = useState(() => {
    return localStorage.getItem("owner_pin") || DEFAULT_PIN;
  });
  const [newPinInput, setNewPinInput] = useState("");
  const [pinSuccessMsg, setPinSuccessMsg] = useState("");

  const [sales, setSales] = useState(() => {
    const saved = localStorage.getItem("sales_data");
    return saved ? JSON.parse(saved) : [];
  });

  const [customItemName, setCustomItemName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [saleSuccess, setSaleSuccess] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState(null);

  // Online / Offline Status
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("sales_data", JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    localStorage.setItem("owner_pin", ownerPin);
  }, [ownerPin]);

  const handleAddSale = (e) => {
    e.preventDefault();
    const qty = parseInt(quantity) || 1;
    const price = parseFloat(unitPrice) || 0;
    const total = qty * price;
    const now = new Date();

    const newEntry = {
      id: Date.now().toString(),
      item: customItemName.trim() || "General Item",
      quantity: qty,
      unitPrice: price,
      totalAmount: total,
      paymentMethod,
      timestamp: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      date: now.toLocaleDateString(),
    };

    setSales([newEntry, ...sales]);
    setCurrentReceipt(newEntry);
    setCustomItemName("");
    setQuantity(1);
    setUnitPrice("");
    setSaleSuccess(true);
    setTimeout(() => setSaleSuccess(false), 3000);
  };

  const handleUnlock = (e) => {
    e.preventDefault();
    if (pinInput === ownerPin) {
      setIsUnlocked(true);
      setPinError("");
      setPinInput("");
    } else {
      setPinError("Incorrect PIN code");
    }
  };

  const handleChangePin = (e) => {
    e.preventDefault();
    if (newPinInput.length === 4) {
      setOwnerPin(newPinInput);
      setNewPinInput("");
      setPinSuccessMsg("PIN Updated Successfully!");
      setTimeout(() => setPinSuccessMsg(""), 3500);
    } else {
      alert("PIN must be exactly 4 digits");
    }
  };

  const handleDeleteSale = (id) => {
    if (window.confirm("Are you sure you want to delete this sale record?")) {
      setSales(sales.filter((s) => s.id !== id));
    }
  };

  const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
  const cashTotal = sales.filter((s) => s.paymentMethod === "Cash").reduce((sum, s) => sum + s.totalAmount, 0);
  const mpesaTotal = sales.filter((s) => s.paymentMethod === "M-Pesa").reduce((sum, s) => sum + s.totalAmount, 0);
  const calculatedTotal = (parseInt(quantity) || 0) * (parseFloat(unitPrice) || 0);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans antialiased pb-28 md:pb-12">
      
      {/* Top Header Bar */}
      <header className="bg-blue-950 border-b-2 border-blue-600 px-4 md:px-8 py-4 flex justify-between items-center sticky top-0 z-30 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg border border-blue-400 shrink-0">
            <Utensils size={26} />
          </div>
          <div>
            <h1 className="text-sm md:text-base font-black text-white tracking-wider uppercase">{RESTAURANT_NAME}</h1>
            <p className="text-xs text-blue-300 font-extrabold tracking-wide">POS & Budget System</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border ${
            isOnline ? "bg-blue-900 text-blue-200 border-blue-400" : "bg-amber-950 text-amber-300 border-amber-500"
          }`}>
            {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>{isOnline ? "Online" : "Offline"}</span>
          </div>

          <button
            onClick={() => setIsUnlocked(false)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition shadow-md ${
              isUnlocked ? "bg-amber-400 text-slate-950 border border-amber-200" : "bg-blue-600 text-white border border-blue-400"
            }`}
          >
            {isUnlocked ? <Unlock size={15} /> : <Lock size={15} />}
            <span>{isUnlocked ? "Owner" : "Staff"}</span>
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-slate-900 border-b border-blue-600/40 px-4 md:px-8 py-3 flex gap-2 overflow-x-auto shadow-inner">
        <button
          onClick={() => setActiveTab("new-sale")}
          className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-xs md:text-sm font-black transition shrink-0 ${
            activeTab === "new-sale" ? "bg-blue-600 text-white border-2 border-blue-400 shadow-lg" : "bg-slate-800 text-slate-300 border border-slate-700"
          }`}
        >
          <Plus size={16} /> New Sale
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-xs md:text-sm font-black transition shrink-0 ${
            activeTab === "history" ? "bg-blue-600 text-white border-2 border-blue-400 shadow-lg" : "bg-slate-800 text-slate-300 border border-slate-700"
          }`}
        >
          <History size={16} /> Sales Log
        </button>
        <button
          onClick={() => setActiveTab("budget")}
          className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-xs md:text-sm font-black transition shrink-0 ${
            activeTab === "budget" ? "bg-blue-600 text-white border-2 border-blue-400 shadow-lg" : "bg-slate-800 text-slate-300 border border-slate-700"
          }`}
        >
          <PieChart size={16} /> Budget & Reports
        </button>
      </div>

      {/* Main Content Area */}
      <main className="p-4 md:p-8 max-w-3xl w-full mx-auto flex-1 space-y-6">
        
        {/* TAB 1: NEW SALE */}
        {activeTab === "new-sale" && (
          <div className="space-y-4">
            {saleSuccess && (
              <div className="p-4 bg-emerald-600 text-white rounded-2xl flex items-center gap-3 text-xs md:text-sm font-black shadow-lg">
                <CheckCircle size={20} className="shrink-0" /> Sale Saved & Receipt Ready!
              </div>
            )}

            <form onSubmit={handleAddSale} className="bg-slate-900 border-2 border-blue-600/50 p-5 md:p-6 rounded-3xl shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h2 className="text-xs md:text-sm font-black text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Plus size={16} /> Register New Sale
                </h2>
                <span className="text-[10px] bg-blue-600/30 text-blue-300 px-2.5 py-1 rounded-full font-black border border-blue-500">Auto-Calculates</span>
              </div>

              {/* Item Name */}
              <div>
                <label className="block text-xs font-black text-slate-200 uppercase mb-1.5 flex items-center gap-1.5">
                  <Tag size={14} className="text-blue-400" /> Item Name / Food Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Chapati, Soda, Beef Stew..."
                  value={customItemName}
                  onChange={(e) => setCustomItemName(e.target.value)}
                  className="w-full p-4 bg-slate-950 border-2 border-blue-600 rounded-2xl text-base md:text-lg font-black text-white placeholder-slate-500 focus:border-blue-400 outline-none"
                  required
                />
              </div>

              {/* Quantity & Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-200 uppercase mb-1.5">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full p-3.5 bg-slate-950 border-2 border-blue-600 rounded-2xl text-center text-2xl font-black text-blue-300 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-200 uppercase mb-1.5">Unit Price (Ksh)</label>
                  <input
                    type="number"
                    placeholder="0"
                    min="0"
                    step="any"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    className="w-full p-3.5 bg-slate-950 border-2 border-blue-600 rounded-2xl text-center text-2xl font-black text-emerald-400 outline-none"
                    required
                  />
                </div>
              </div>

              {/* Calculated Total */}
              <div className="p-4 bg-blue-600 text-white rounded-2xl flex justify-between items-center shadow-lg border border-blue-400">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider block text-blue-200">Total Calculation</span>
                  <span className="text-xs font-bold text-white">{quantity || 0} items × Ksh {unitPrice || 0}</span>
                </div>
                <div className="text-xl md:text-2xl font-black tracking-tight text-white">
                  Ksh {calculatedTotal.toLocaleString()}
                </div>
              </div>

              {/* Payment Methods */}
              <div>
                <label className="block text-xs font-black text-slate-200 uppercase mb-1.5">Payment Method</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("Cash")}
                    className={`py-3.5 rounded-2xl border-2 font-black text-xs flex items-center justify-center gap-2 transition ${
                      paymentMethod === "Cash" ? "bg-blue-600 border-white text-white shadow-md" : "bg-slate-950 border-slate-800 text-slate-400"
                    }`}
                  >
                    <Wallet size={16} /> CASH
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("M-Pesa")}
                    className={`py-3.5 rounded-2xl border-2 font-black text-xs flex items-center justify-center gap-2 transition ${
                      paymentMethod === "M-Pesa" ? "bg-blue-600 border-white text-white shadow-md" : "bg-slate-950 border-slate-800 text-slate-400"
                    }`}
                  >
                    <Smartphone size={16} /> M-PESA
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-4 rounded-2xl shadow-xl text-xs md:text-sm tracking-wider uppercase flex items-center justify-center gap-2 border border-emerald-300"
              >
                <Sparkles size={18} /> Complete Sale & Print Receipt
              </button>
            </form>
          </div>
        )}

        {/* OWNER PIN LOCK GATE */}
        {!isUnlocked && (activeTab === "history" || activeTab === "budget") && (
          <div className="bg-slate-900 border-2 border-blue-600/50 p-6 md:p-8 rounded-3xl shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 bg-blue-600/20 text-blue-400 rounded-2xl flex items-center justify-center mx-auto border border-blue-500">
              <Lock size={28} />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Owner Access Required</h3>
              <p className="text-xs text-slate-300 mt-1">Enter 4-digit PIN to open sales history and budget reports.</p>
            </div>

            <form onSubmit={handleUnlock} className="space-y-3 max-w-xs mx-auto">
              <input
                type="password"
                maxLength={4}
                placeholder="****"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="w-full p-4 text-center tracking-widest text-2xl font-black bg-slate-950 border-2 border-blue-600 rounded-2xl text-blue-400 outline-none"
              />
              {pinError && <p className="text-xs text-rose-400 font-bold">{pinError}</p>}
              <button
                type="submit"
                className="w-full bg-blue-600 text-white font-black py-3.5 rounded-2xl text-xs uppercase tracking-wider border border-blue-400"
              >
                Unlock Reports
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: HISTORY (Unlocked) */}
        {isUnlocked && activeTab === "history" && (
          <div className="space-y-3">
            <div className="flex justify-between items-center bg-slate-900 p-3 rounded-2xl border border-blue-600/40">
              <h2 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <History size={16} className="text-blue-400" /> Sales Log
              </h2>
              <span className="text-[11px] bg-blue-600 text-white font-black px-3 py-1 rounded-full shadow">{sales.length} Sales</span>
            </div>

            {sales.length === 0 ? (
              <div className="text-center py-12 bg-slate-900 rounded-3xl border border-slate-800">
                <p className="text-xs text-slate-400 font-bold">No sales recorded yet.</p>
              </div>
            ) : (
              sales.map((sale) => (
                <div key={sale.id} className="bg-slate-900 border-2 border-blue-600/40 p-4 rounded-2xl shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-black text-sm md:text-base text-white break-words">
                      {sale.quantity}x {sale.item}
                    </div>
                    <div className="text-xs text-slate-300 flex items-center gap-2 mt-1 font-bold">
                      <span>{sale.timestamp}</span>
                      <span>•</span>
                      <span className="text-blue-400 font-black">{sale.paymentMethod}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                    <span className="font-black text-emerald-400 text-base">Ksh {sale.totalAmount.toLocaleString()}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentReceipt(sale)}
                        className="p-2.5 bg-blue-600 text-white rounded-xl font-bold"
                        title="View Receipt"
                      >
                        <Receipt size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteSale(sale.id)}
                        className="p-2.5 bg-rose-900/60 text-rose-300 rounded-xl border border-rose-600"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 3: BUDGET & REPORTS (Unlocked) */}
        {isUnlocked && activeTab === "budget" && (
          <div className="space-y-4">
            <h2 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <PieChart size={16} className="text-blue-400" /> Financial & Budget Summary
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-5 rounded-3xl sm:col-span-2 shadow-xl border border-blue-400">
                <span className="text-[11px] font-black uppercase tracking-wider text-blue-200">Total Revenue Today</span>
                <div className="text-3xl font-black mt-1">Ksh {totalRevenue.toLocaleString()}</div>
                <div className="text-xs text-blue-100 mt-1 font-bold">{sales.length} completed transactions</div>
              </div>

              <div className="bg-slate-900 border-2 border-blue-600/40 p-4 rounded-2xl">
                <span className="text-[10px] font-black text-slate-400 uppercase">💵 Cash Total</span>
                <div className="text-lg font-black text-emerald-400 mt-1">Ksh {cashTotal.toLocaleString()}</div>
              </div>

              <div className="bg-slate-900 border-2 border-blue-600/40 p-4 rounded-2xl">
                <span className="text-[10px] font-black text-slate-400 uppercase">📱 M-Pesa Total</span>
                <div className="text-lg font-black text-emerald-400 mt-1">Ksh {mpesaTotal.toLocaleString()}</div>
              </div>
            </div>

            {/* Change PIN Box */}
            <div className="bg-slate-900 border-2 border-blue-600/40 p-4 md:p-5 rounded-3xl space-y-3">
              <h3 className="text-xs font-black text-white flex items-center gap-1.5 uppercase">
                <Key size={16} className="text-amber-400" /> Change Security PIN
              </h3>
              {pinSuccessMsg && <p className="text-xs text-emerald-400 font-bold">{pinSuccessMsg}</p>}
              <form onSubmit={handleChangePin} className="flex gap-2">
                <input
                  type="password"
                  maxLength={4}
                  placeholder="New 4-Digit"
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value)}
                  className="flex-1 p-3 text-sm bg-slate-950 border-2 border-blue-600 rounded-xl font-bold text-blue-300 outline-none"
                />
                <button
                  type="submit"
                  className="bg-blue-600 text-white text-xs font-black px-4 rounded-xl border border-blue-400"
                >
                  Save PIN
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* RECEIPT MODAL */}
      {currentReceipt && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-3xl p-6 max-w-xs w-full shadow-2xl relative space-y-4 font-mono border-4 border-blue-600">
            <button
              onClick={() => setCurrentReceipt(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-900 bg-slate-100 p-2 rounded-full"
            >
              <X size={20} />
            </button>

            <div className="text-center border-b border-dashed border-slate-300 pb-3 space-y-1">
              <h3 className="font-black text-base uppercase tracking-tight">{RESTAURANT_NAME}</h3>
              <p className="text-[10px] text-slate-500 uppercase font-sans font-bold">Official Receipt</p>
              <p className="text-[10px] text-slate-500">{currentReceipt.date} • {currentReceipt.timestamp}</p>
            </div>

            <div className="text-xs space-y-2 py-1">
              <div className="flex justify-between font-black text-slate-900">
                <span className="truncate pr-2">{currentReceipt.quantity}x {currentReceipt.item}</span>
                <span className="shrink-0 font-black">Ksh {currentReceipt.totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-600 font-bold">
                <span>Unit Price:</span>
                <span>Ksh {currentReceipt.unitPrice}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-600 font-bold">
                <span>Paid Via:</span>
                <span className="font-black text-slate-900">{currentReceipt.paymentMethod}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-slate-300 pt-3 flex justify-between items-center font-black text-sm">
              <span>TOTAL PAID</span>
              <span className="text-blue-600 text-base font-black">Ksh {currentReceipt.totalAmount.toLocaleString()}</span>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-blue-600 text-white py-3 rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition"
              >
                <Printer size={14} /> Print
              </button>
              <button
                onClick={() => setCurrentReceipt(null)}
                className="flex-1 bg-slate-200 text-slate-800 py-3 rounded-2xl text-xs font-black active:scale-95 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Bottom Navigation Bar (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-blue-950 border-t-2 border-blue-600 flex justify-around p-3 z-20 shadow-2xl">
        <button
          onClick={() => setActiveTab("new-sale")}
          className={`flex flex-col items-center gap-1 text-[11px] font-black transition ${
            activeTab === "new-sale" ? "text-blue-300 scale-105" : "text-slate-400"
          }`}
        >
          <Utensils size={20} />
          ORDER
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex flex-col items-center gap-1 text-[11px] font-black transition ${
            activeTab === "history" ? "text-blue-300 scale-105" : "text-slate-400"
          }`}
        >
          <History size={20} />
          LOGS
        </button>
        <button
          onClick={() => setActiveTab("budget")}
          className={`flex flex-col items-center gap-1 text-[11px] font-black transition ${
            activeTab === "budget" ? "text-blue-300 scale-105" : "text-slate-400"
          }`}
        >
          <PieChart size={20} />
          BUDGET
        </button>
      </nav>
    </div>
  );
}