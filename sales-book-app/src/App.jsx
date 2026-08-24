import React, { useRef, useState, useEffect, memo } from "react";
import { useReactToPrint } from "react-to-print";
import { Plus, Receipt, Clock, Smartphone, Banknote, X, Check, Trash2, AlertCircle, Wifi, WifiOff } from "lucide-react";
import { db } from "./firebase.js";
import { collection, addDoc, deleteDoc, doc, setDoc, getDoc } from "firebase/firestore";

const money = (n) =>
  "KES " + Number(n || 0).toLocaleString("en-KE", { maximumFractionDigits: 0 });

const todayKey = (d = new Date()) => d.toISOString().slice(0, 10);

const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });

const fmtDateHead = (key) => {
  const d = new Date(key + "T00:00:00");
  const today = todayKey();
  const yestKey = todayKey(new Date(Date.now() - 86400000));
  if (key === today) return "Today";
  if (key === yestKey) return "Yesterday";
  return d.toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short" });
};

export default function App() {
  const [restaurantName, setRestaurantName] = useState(() => {
    return localStorage.getItem("restaurant_name") || "My Restaurant";
  });
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  
  // Local-first transaction state
  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem("restaurant_sales");
    return saved ? JSON.parse(saved) : [];
  });

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [view, setView] = useState("new");
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState("");

  const [item, setItem] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [mpesaCode, setMpesaCode] = useState("");
  const [customer, setCustomer] = useState("");

  // Save transactions to LocalStorage on every update
  useEffect(() => {
    localStorage.setItem("restaurant_sales", JSON.stringify(transactions));
  }, [transactions]);

  // Network monitor & auto-sync background process
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Sync un-synced local records to Firebase when online
    if (isOnline) {
      syncUnsyncedTransactions();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [isOnline, transactions]);

  const syncUnsyncedTransactions = async () => {
    const pending = transactions.filter((t) => !t.synced);
    if (pending.length === 0) return;

    for (const tx of pending) {
      try {
        const { synced, id, ...dataToSync } = tx;
        await addDoc(collection(db, "transactions"), dataToSync);
        
        // Mark as synced locally
        setTransactions((prev) =>
          prev.map((item) => (item.id === tx.id ? { ...item, synced: true } : item))
        );
      } catch (err) {
        console.error("Background sync deferred:", err);
        break; // Stop loop if connection drops mid-sync
      }
    }
  };

  const saveName = async () => {
    const name = nameDraft.trim() || "My Restaurant";
    setRestaurantName(name);
    localStorage.setItem("restaurant_name", name);
    setEditingName(false);
    if (isOnline) {
      try {
        await setDoc(doc(db, "config", "restaurant"), { name });
      } catch (e) {
        console.error("Cloud name sync deferred");
      }
    }
  };

  const resetForm = () => {
    setItem("");
    setAmount("");
    setMethod("cash");
    setMpesaCode("");
    setCustomer("");
  };

  const submit = async () => {
    setError("");
    const amt = parseFloat(amount);
    if (!item.trim()) {
      setError("Enter what was sold.");
      return;
    }
    if (!amt || amt <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (method === "mpesa" && !mpesaCode.trim()) {
      setError("Enter the M-Pesa code.");
      return;
    }

    const newTx = {
      id: "loc_" + Date.now() + "_" + Math.random().toString(36).substring(2, 5),
      item: item.trim(),
      amount: amt,
      method,
      mpesaCode: method === "mpesa" ? mpesaCode.trim().toUpperCase() : "",
      customer: customer.trim(),
      time: new Date().toISOString(),
      synced: false,
    };

    // Save locally right away (lightning fast)
    setTransactions((prev) => [newTx, ...prev]);
    setReceipt(newTx);
    resetForm();

    // Try background upload if online
    if (isOnline) {
      try {
        const { synced, id, ...dataToSync } = newTx;
        await addDoc(collection(db, "transactions"), dataToSync);
        setTransactions((prev) =>
          prev.map((t) => (t.id === newTx.id ? { ...t, synced: true } : t))
        );
      } catch (e) {
        console.log("Saved locally. Cloud upload deferred.");
      }
    }
  };

  const removeTx = async (id) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    if (isOnline && !id.startsWith("loc_")) {
      try {
        await deleteDoc(doc(db, "transactions", id));
      } catch (e) {
        console.error("Delete pending cloud update");
      }
    }
  };

  const todays = transactions.filter((t) => todayKey(new Date(t.time)) === todayKey());
  const todayCash = todays.filter((t) => t.method === "cash").reduce((s, t) => s + t.amount, 0);
  const todayMpesa = todays.filter((t) => t.method === "mpesa").reduce((s, t) => s + t.amount, 0);

  const byDate = transactions.reduce((acc, t) => {
    const k = todayKey(new Date(t.time));
    (acc[k] = acc[k] || []).push(t);
    return acc;
  }, {});
  const dateKeys = Object.keys(byDate).sort((a, b) => (a < b ? 1 : -1));

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", fontFamily: "system-ui, -apple-system, sans-serif", background: "#F5F6F3", minHeight: "100vh", paddingBottom: 84 }}>
      <div style={{ background: "#16324A", color: "#fff", padding: "20px 18px 16px" }}>
        {editingName ? (
          <div style={{ display: "flex", gap: 8 }}>
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="Restaurant name"
              style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "none", fontSize: 16 }}
            />
            <button onClick={saveName} style={{ background: "#3FA34D", border: "none", borderRadius: 8, padding: "0 14px", color: "#fff" }}>
              <Check size={18} />
            </button>
          </div>
        ) : (
          <div
            onClick={() => {
              setNameDraft(restaurantName);
              setEditingName(true);
            }}
            style={{ fontSize: 20, fontWeight: 700, cursor: "pointer" }}
          >
            {restaurantName}
          </div>
        )}
        <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
          {isOnline ? <Wifi size={14} color="#3FA34D" /> : <WifiOff size={14} color="#E24B4A" />}
          <span>{isOnline ? "Online · Auto-sync active" : "Offline mode · Saving locally"}</span>
        </div>
      </div>

      {view === "new" && (
        <div style={{ padding: 18 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 18 }}>
            <div style={{ fontSize: 13, color: "#6B6058", marginBottom: 6, fontWeight: 600 }}>WHAT WAS SOLD</div>
            <input
              value={item}
              onChange={(e) => setItem(e.target.value)}
              placeholder="e.g. 2 Chicken plates, 1 Soda"
              style={inputStyle}
            />

            <div style={{ fontSize: 13, color: "#6B6058", margin: "16px 0 6px", fontWeight: 600 }}>AMOUNT (KES)</div>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="0"
              inputMode="decimal"
              style={{ ...inputStyle, fontSize: 24, fontFamily: "ui-monospace, Menlo, monospace", fontWeight: 700 }}
            />

            <div style={{ fontSize: 13, color: "#6B6058", margin: "16px 0 6px", fontWeight: 600 }}>PAYMENT METHOD</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setMethod("cash")} style={{ ...methodBtn, ...(method === "cash" ? methodBtnActiveCash : {}) }}>
                <Banknote size={18} />
                Cash
              </button>
              <button onClick={() => setMethod("mpesa")} style={{ ...methodBtn, ...(method === "mpesa" ? methodBtnActiveMpesa : {}) }}>
                <Smartphone size={18} />
                M-Pesa
              </button>
            </div>

            {method === "mpesa" && (
              <>
                <div style={{ fontSize: 13, color: "#6B6058", margin: "16px 0 6px", fontWeight: 600 }}>M-PESA CODE</div>
                <input
                  value={mpesaCode}
                  onChange={(e) => setMpesaCode(e.target.value.toUpperCase())}
                  placeholder="e.g. QFH7X8YABC"
                  style={{ ...inputStyle, fontFamily: "ui-monospace, Menlo, monospace" }}
                />
              </>
            )}

            <div style={{ fontSize: 13, color: "#6B6058", margin: "16px 0 6px", fontWeight: 600 }}>CUSTOMER (OPTIONAL)</div>
            <input
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              placeholder="Name, if you'd like"
              style={inputStyle}
            />

            {error && (
              <div style={{ display: "flex", gap: 6, alignItems: "center", color: "#B33A2E", fontSize: 13, marginTop: 12 }}>
                <AlertCircle size={15} /> {error}
              </div>
            )}

            <button onClick={submit} style={submitBtn}>
              <Receipt size={18} />
              Save & issue receipt
            </button>
          </div>
        </div>
      )}

      {view === "today" && (
        <div style={{ padding: 18 }}>
          <TotalsBar cash={todayCash} mpesa={todayMpesa} count={todays.length} />
          {todays.length === 0 ? (
            <EmptyState text="No sales recorded yet today." />
          ) : (
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              {todays.map((t) => (
                <TxRow key={t.id} t={t} onOpen={() => setReceipt(t)} onDelete={() => removeTx(t.id)} />
              ))}
            </div>
          )}
        </div>
      )}

      {view === "history" && (
        <div style={{ padding: 18 }}>
          {dateKeys.length === 0 ? (
            <EmptyState text="No records yet. Sales you save will show up here." />
          ) : (
            dateKeys.map((k) => {
              const list = byDate[k];
              const cash = list.filter((t) => t.method === "cash").reduce((s, t) => s + t.amount, 0);
              const mpesa = list.filter((t) => t.method === "mpesa").reduce((s, t) => s + t.amount, 0);
              return (
                <div key={k} style={{ marginBottom: 22 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, color: "#16324A" }}>
                    {fmtDateHead(k)}
                    <span style={{ fontWeight: 400, color: "#6B6058", fontSize: 13 }}> · {money(cash + mpesa)}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {list.map((t) => (
                      <TxRow key={t.id} t={t} onOpen={() => setReceipt(t)} onDelete={() => removeTx(t.id)} />
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid #E5E3DD", display: "flex", maxWidth: 480, margin: "0 auto" }}>
        <NavBtn active={view === "new"} onClick={() => setView("new")} icon={<Plus size={20} />} label="New sale" />
        <NavBtn active={view === "today"} onClick={() => setView("today")} icon={<Clock size={20} />} label="Today" />
        <NavBtn active={view === "history"} onClick={() => setView("history")} icon={<Receipt size={20} />} label="History" />
      </div>

      {receipt && <ReceiptModal t={receipt} restaurantName={restaurantName} onClose={() => setReceipt(null)} />}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid #DEDBD3",
  fontSize: 16,
  outline: "none",
};

const methodBtn = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "12px 0",
  borderRadius: 10,
  border: "1px solid #DEDBD3",
  background: "#fff",
  fontSize: 15,
  fontWeight: 600,
  color: "#4A4640",
  cursor: "pointer",
};

const methodBtnActiveCash = { background: "#FCF3E6", border: "1px solid #C9862B", color: "#8A5A17" };
const methodBtnActiveMpesa = { background: "#EAF6EC", border: "1px solid #3FA34D", color: "#256B31" };

const submitBtn = {
  width: "100%",
  marginTop: 22,
  padding: "14px 0",
  borderRadius: 10,
  border: "none",
  background: "#16324A",
  color: "#fff",
  fontSize: 16,
  fontWeight: 700,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  cursor: "pointer",
};

const TotalsBar = memo(function TotalsBar({ cash, mpesa, count }) {
  return (
    <div style={{ display: "flex", gap: 10 }}>
      <div style={{ flex: 1, background: "#fff", borderRadius: 12, padding: "12px 14px" }}>
        <div style={{ fontSize: 12, color: "#6B6058", fontWeight: 600 }}>CASH</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#8A5A17", fontFamily: "ui-monospace, Menlo, monospace" }}>{money(cash)}</div>
      </div>
      <div style={{ flex: 1, background: "#fff", borderRadius: 12, padding: "12px 14px" }}>
        <div style={{ fontSize: 12, color: "#6B6058", fontWeight: 600 }}>M-PESA</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#256B31", fontFamily: "ui-monospace, Menlo, monospace" }}>{money(mpesa)}</div>
      </div>
      <div style={{ flex: 1, background: "#16324A", borderRadius: 12, padding: "12px 14px" }}>
        <div style={{ fontSize: 12, color: "#B8C6D2", fontWeight: 600 }}>TOTAL · {count}</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", fontFamily: "ui-monospace, Menlo, monospace" }}>{money(cash + mpesa)}</div>
      </div>
    </div>
  );
});

const TxRow = memo(function TxRow({ t, onOpen, onDelete }) {
  const [confirmDel, setConfirmDel] = useState(false);
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
      <div onClick={onOpen} style={{ flex: 1, cursor: "pointer" }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#231F1B" }}>
          {t.item} {!t.synced && <span style={{ fontSize: 11, color: "#C9862B", fontWeight: 400 }}>(Pending sync)</span>}
        </div>
        <div style={{ fontSize: 12, color: "#6B6058", marginTop: 2 }}>
          {fmtTime(t.time)} · {t.method === "mpesa" ? `M-Pesa · ${t.mpesaCode}` : "Cash"}
          {t.customer ? ` · ${t.customer}` : ""}
        </div>
      </div>
      <div onClick={onOpen} style={{ fontSize: 16, fontWeight: 700, fontFamily: "ui-monospace, Menlo, monospace", color: "#16324A", cursor: "pointer" }}>
        {money(t.amount)}
      </div>
      {confirmDel ? (
        <button onClick={onDelete} style={{ background: "#E24B4A", border: "none", borderRadius: 8, padding: 8, color: "#fff" }}>
          <Check size={14} />
        </button>
      ) : (
        <button onClick={() => setConfirmDel(true)} style={{ background: "none", border: "none", color: "#B4B2A9", padding: 8 }}>
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
});

function EmptyState({ text }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "28px 18px", textAlign: "center", color: "#6B6058", fontSize: 14, marginTop: 14 }}>
      {text}
    </div>
  );
}

function NavBtn({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: "10px 0 12px",
        border: "none",
        background: "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 3,
        color: active ? "#16324A" : "#A9A69E",
        fontWeight: active ? 700 : 500,
        fontSize: 11,
        cursor: "pointer",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function ReceiptModal({ t, restaurantName, onClose }) {
  const printRef = useRef();
  const handlePrint = useReactToPrint({ contentRef: printRef });

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(20,20,18,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50 }}
      onClick={onClose}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center", width: "100%", maxWidth: 340 }}>
        <div
          ref={printRef}
          onClick={(e) => e.stopPropagation()}
          style={{ background: "#fff", width: "100%", borderRadius: 4, padding: "26px 22px 18px", fontFamily: "ui-monospace, Menlo, monospace", position: "relative" }}
        >
          <button onClick={onClose} style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", color: "#B4B2A9" }}>
            <X size={18} />
          </button>

          <div style={{ textAlign: "center", fontFamily: "system-ui, sans-serif", fontWeight: 800, fontSize: 17, color: "#16324A" }}>
            {restaurantName}
          </div>
          <div style={{ textAlign: "center", fontSize: 11, color: "#6B6058", marginTop: 2, fontFamily: "system-ui, sans-serif" }}>
            Sales receipt
          </div>

          <div style={{ borderTop: "1px dashed #CFCCC4", margin: "16px 0" }} />

          <Row label="Date" value={new Date(t.time).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })} />
          <Row label="Time" value={fmtTime(t.time)} />
          <Row label="Item" value={t.item} wrap />
          {t.customer && <Row label="Customer" value={t.customer} />}
          <Row label="Method" value={t.method === "mpesa" ? "M-Pesa" : "Cash"} />
          {t.method === "mpesa" && <Row label="Code" value={t.mpesaCode} />}

          <div style={{ borderTop: "1px dashed #CFCCC4", margin: "16px 0" }} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 13, fontFamily: "system-ui, sans-serif", color: "#6B6058", fontWeight: 600 }}>TOTAL</span>
            <span style={{ fontSize: 24, fontWeight: 800 }}>{money(t.amount)}</span>
          </div>

          <div
            style={{
              marginTop: 20, textAlign: "center", fontSize: 11, color: "#A9A69E", fontFamily: "system-ui, sans-serif", paddingTop: 12,
              backgroundImage: "repeating-linear-gradient(90deg, #CFCCC4 0 6px, transparent 6px 12px)", backgroundSize: "12px 1px", backgroundRepeat: "no-repeat",
            }}
          >
            Thank you — asante
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePrint();
          }}
          style={{
            width: "100%", padding: "12px", background: "#16324A", color: "#fff", border: "none", borderRadius: 8,
            fontWeight: 700, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8
          }}
        >
          <Receipt size={18} /> Print Receipt
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, wrap }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6, fontSize: 13 }}>
      <span style={{ color: "#6B6058", fontFamily: "system-ui, sans-serif", whiteSpace: "nowrap" }}>{label}</span>
      <span style={{ color: "#231F1B", textAlign: "right", wordBreak: wrap ? "break-word" : "normal" }}>{value}</span>
    </div>
  );
}