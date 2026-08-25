import React, { useRef, useState, useEffect, memo } from "react";
import { useReactToPrint } from "react-to-print";
import { Plus, Receipt, Clock, Smartphone, Banknote, X, Check, Trash2, AlertCircle, Wifi, WifiOff, Wallet, Lock, Unlock, KeyRound } from "lucide-react";
import { db } from "./firebase.js";
import { collection, addDoc, deleteDoc, doc, setDoc, getDocs } from "firebase/firestore";

const money = (n) =>
  "KES " + Number(n || 0).toLocaleString("en-KE", { maximumFractionDigits: 0 });

const todayKey = (d = new Date()) => d.toISOString().slice(0, 10);
const monthKey = (d = new Date()) => d.toISOString().slice(0, 7);

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

  // Owner PIN States
  const [ownerPin, setOwnerPin] = useState(() => {
    return localStorage.getItem("owner_pin") || "1234";
  });
  const [isOwnerUnlocked, setIsOwnerUnlocked] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [changingPin, setChangingPin] = useState(false);
  const [newPinDraft, setNewPinDraft] = useState("");

  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem("restaurant_sales");
    return saved ? JSON.parse(saved) : [];
  });

  const [expenses, setExpenses] = useState(() => {
    const saved = localStorage.getItem("restaurant_expenses");
    return saved ? JSON.parse(saved) : [];
  });
  const [dailyBudget, setDailyBudgetState] = useState(() => {
    return localStorage.getItem("daily_budget") || "";
  });
  const [monthlyBudget, setMonthlyBudgetState] = useState(() => {
    return localStorage.getItem("monthly_budget") || "";
  });
  const [expenseItem, setExpenseItem] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [editingBudget, setEditingBudget] = useState(false);
  const [dailyBudgetDraft, setDailyBudgetDraft] = useState("");
  const [monthlyBudgetDraft, setMonthlyBudgetDraft] = useState("");

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [view, setView] = useState("new");
  const [receipt, setReceipt] = useState(null);
  const [dailyReport, setDailyReport] = useState(null);
  const [error, setError] = useState("");
  const [clearing, setClearing] = useState(false);

  const [item, setItem] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [mpesaCode, setMpesaCode] = useState("");
  const [customer, setCustomer] = useState("");

  const tapCountRef = useRef(0);
  const tapTimerRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("restaurant_sales", JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem("restaurant_expenses", JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (isOnline) {
      syncUnsyncedTransactions();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [isOnline]);

  const syncUnsyncedTransactions = async () => {
    const pending = transactions.filter((t) => !t.synced);
    if (pending.length === 0) return;

    for (const tx of pending) {
      try {
        const { synced, id, ...dataToSync } = tx;
        await addDoc(collection(db, "transactions"), dataToSync);
        setTransactions((prev) =>
          prev.map((item) => (item.id === tx.id ? { ...item, synced: true } : item))
        );
      } catch (err) {
        console.error("Background sync deferred:", err);
        break;
      }
    }
  };

  const requireOwnerAccess = (onSuccessAction) => {
    if (isOwnerUnlocked) {
      onSuccessAction();
    } else {
      setPendingAction(() => onSuccessAction);
      setShowPinModal(true);
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

  const saveNewPin = () => {
    if (newPinDraft.length !== 4 || !/^\d+$/.test(newPinDraft)) {
      setError("PIN must be exactly 4 digits.");
      return;
    }
    setOwnerPin(newPinDraft);
    localStorage.setItem("owner_pin", newPinDraft);
    setChangingPin(false);
    setNewPinDraft("");
    setError("");
    alert("Owner PIN updated successfully!");
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

    setTransactions((prev) => [newTx, ...prev]);
    setReceipt(newTx);
    resetForm();

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

  const removeTx = (id) => {
    requireOwnerAccess(async () => {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      if (isOnline && !id.startsWith("loc_")) {
        try {
          await deleteDoc(doc(db, "transactions", id));
        } catch (e) {
          console.error("Delete pending cloud update");
        }
      }
    });
  };

  const submitExpense = () => {
    setError("");
    const amt = parseFloat(expenseAmount);
    if (!expenseItem.trim()) {
      setError("Enter what was bought.");
      return;
    }
    if (!amt || amt <= 0) {
      setError("Enter a valid amount.");
      return;
    }

    const newExpense = {
      id: "exp_" + Date.now() + "_" + Math.random().toString(36).substring(2, 5),
      item: expenseItem.trim(),
      amount: amt,
      time: new Date().toISOString(),
    };

    setExpenses((prev) => [newExpense, ...prev]);
    setExpenseItem("");
    setExpenseAmount("");
  };

  const removeExpense = (id) => {
    requireOwnerAccess(() => {
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    });
  };

  const saveBudgets = () => {
    const daily = dailyBudgetDraft.trim();
    const monthly = monthlyBudgetDraft.trim();
    setDailyBudgetState(daily);
    setMonthlyBudgetState(monthly);
    localStorage.setItem("daily_budget", daily);
    localStorage.setItem("monthly_budget", monthly);
    setEditingBudget(false);
  };

  const todaysExpenses = expenses.filter((e) => todayKey(new Date(e.time)) === todayKey());
  const monthsExpenses = expenses.filter((e) => monthKey(new Date(e.time)) === monthKey());
  const todaySpent = todaysExpenses.reduce((s, e) => s + e.amount, 0);
  const monthSpent = monthsExpenses.reduce((s, e) => s + e.amount, 0);
  const dailyBudgetNum = parseFloat(dailyBudget) || 0;
  const monthlyBudgetNum = parseFloat(monthlyBudget) || 0;
  const dailyPct = dailyBudgetNum > 0 ? Math.min(100, (todaySpent / dailyBudgetNum) * 100) : 0;
  const monthlyPct = monthlyBudgetNum > 0 ? Math.min(100, (monthSpent / monthlyBudgetNum) * 100) : 0;
  const dailyOver = dailyBudgetNum > 0 && todaySpent > dailyBudgetNum;
  const monthlyOver = monthlyBudgetNum > 0 && monthSpent > monthlyBudgetNum;

  const handleSecretTap = () => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    tapTimerRef.current = setTimeout(() => {
      tapCountRef.current = 0;
    }, 2000);

    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0;
      requireOwnerAccess(clearAllData);
    }
  };

  const clearAllData = async () => {
    const sure = window.confirm(
      "Clear ALL sales and expense data? This cannot be undone."
    );
    if (!sure) return;

    setClearing(true);
    try {
      setTransactions([]);
      setExpenses([]);
      localStorage.removeItem("restaurant_sales");
      localStorage.removeItem("restaurant_expenses");

      if (isOnline) {
        try {
          const snap = await getDocs(collection(db, "transactions"));
          for (const d of snap.docs) {
            await deleteDoc(doc(db, "transactions", d.id));
          }
        } catch (e) {
          console.error("Cloud cleanup deferred:", e);
        }
      }

      window.alert("All data cleared.");
    } finally {
      setClearing(false);
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {editingName ? (
            <div style={{ display: "flex", gap: 8, flex: 1, marginRight: 10 }}>
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

          <button
            onClick={() => {
              if (isOwnerUnlocked) {
                setIsOwnerUnlocked(false);
              } else {
                requireOwnerAccess(() => {});
              }
            }}
            style={{ background: isOwnerUnlocked ? "#3FA34D" : "rgba(255,255,255,0.15)", border: "none", borderRadius: 20, padding: "6px 12px", color: "#fff", display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
          >
            {isOwnerUnlocked ? <Unlock size={14} /> : <Lock size={14} />}
            {isOwnerUnlocked ? "Owner Unlocked" : "Staff Mode"}
          </button>
        </div>

        <div
          onClick={handleSecretTap}
          style={{ fontSize: 12, opacity: 0.8, marginTop: 6, display: "flex", alignItems: "center", gap: 6, userSelect: "none" }}
        >
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
          {todays.length > 0 && (
            <button
              onClick={() => setDailyReport({ dateKey: todayKey(), list: todays, cash: todayCash, mpesa: todayMpesa })}
              style={{ ...submitBtn, marginTop: 12, background: "#fff", color: "#16324A", border: "1px solid #DEDBD3" }}
            >
              <Receipt size={18} />
              Print daily report
            </button>
          )}
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
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#16324A" }}>
                      {fmtDateHead(k)}
                      <span style={{ fontWeight: 400, color: "#6B6058", fontSize: 13 }}> · {money(cash + mpesa)}</span>
                    </div>
                    <button
                      onClick={() => setDailyReport({ dateKey: k, list, cash, mpesa })}
                      style={{ background: "none", border: "none", color: "#16324A", cursor: "pointer" }}
                    >
                      <Receipt size={16} />
                    </button>
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

      {view === "budget" && (
        <div style={{ padding: 18 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 18, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#16324A" }}>Budgets</div>
              {!editingBudget && (
                <button
                  onClick={() => {
                    setDailyBudgetDraft(dailyBudget);
                    setMonthlyBudgetDraft(monthlyBudget);
                    setEditingBudget(true);
                  }}
                  style={{ background: "none", border: "none", color: "#16324A", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
                >
                  Edit
                </button>
              )}
            </div>

            {editingBudget ? (
              <>
                <div style={{ fontSize: 13, color: "#6B6058", marginBottom: 6, fontWeight: 600 }}>DAILY BUDGET (KES)</div>
                <input
                  value={dailyBudgetDraft}
                  onChange={(e) => setDailyBudgetDraft(e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder="0"
                  inputMode="decimal"
                  style={inputStyle}
                />
                <div style={{ fontSize: 13, color: "#6B6058", margin: "14px 0 6px", fontWeight: 600 }}>MONTHLY BUDGET (KES)</div>
                <input
                  value={monthlyBudgetDraft}
                  onChange={(e) => setMonthlyBudgetDraft(e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder="0"
                  inputMode="decimal"
                  style={inputStyle}
                />
                <button onClick={saveBudgets} style={{ ...submitBtn, marginTop: 16 }}>
                  <Check size={18} />
                  Save budgets
                </button>
              </>
            ) : (
              <>
                <BudgetBar
                  label="TODAY"
                  spent={todaySpent}
                  budget={dailyBudgetNum}
                  pct={dailyPct}
                  over={dailyOver}
                />
                <div style={{ height: 14 }} />
                <BudgetBar
                  label="THIS MONTH"
                  spent={monthSpent}
                  budget={monthlyBudgetNum}
                  pct={monthlyPct}
                  over={monthlyOver}
                />
              </>
            )}
          </div>

          <div style={{ background: "#fff", borderRadius: 14, padding: 18, marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: "#6B6058", marginBottom: 6, fontWeight: 600 }}>WHAT WAS BOUGHT</div>
            <input
              value={expenseItem}
              onChange={(e) => setExpenseItem(e.target.value)}
              placeholder="e.g. Chicken, Charcoal, Rice"
              style={inputStyle}
            />
            <div style={{ fontSize: 13, color: "#6B6058", margin: "16px 0 6px", fontWeight: 600 }}>AMOUNT (KES)</div>
            <input
              value={expenseAmount}
              onChange={(e) => setExpenseAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="0"
              inputMode="decimal"
              style={{ ...inputStyle, fontSize: 24, fontFamily: "ui-monospace, Menlo, monospace", fontWeight: 700 }}
            />
            {error && (
              <div style={{ display: "flex", gap: 6, alignItems: "center", color: "#B33A2E", fontSize: 13, marginTop: 12 }}>
                <AlertCircle size={15} /> {error}
              </div>
            )}
            <button onClick={submitExpense} style={submitBtn}>
              <Wallet size={18} />
              Log expense
            </button>
          </div>

          <div style={{ background: "#fff", borderRadius: 14, padding: 18, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#16324A" }}>Owner Security</div>
              <button
                onClick={() => setChangingPin(!changingPin)}
                style={{ background: "none", border: "none", color: "#16324A", fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
              >
                <KeyRound size={14} /> Change PIN
              </button>
            </div>
            {changingPin && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, color: "#6B6058", marginBottom: 6 }}>NEW 4-DIGIT PIN</div>
                <input
                  type="password"
                  maxLength={4}
                  value={newPinDraft}
                  onChange={(e) => setNewPinDraft(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="••••"
                  style={{ ...inputStyle, fontSize: 18, textAlign: "center", tracking: 4 }}
                />
                <button onClick={saveNewPin} style={{ ...submitBtn, marginTop: 10, padding: "10px 0" }}>
                  Update Owner PIN
                </button>
              </div>
            )}
          </div>

          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10, color: "#16324A" }}>Recent expenses</div>
          {expenses.length === 0 ? (
            <EmptyState text="No expenses logged yet." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {expenses.slice(0, 30).map((e) => (
                <ExpenseRow key={e.id} e={e} onDelete={() => removeExpense(e.id)} />
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid #E5E3DD", display: "flex", maxWidth: 480, margin: "0 auto" }}>
        <NavBtn active={view === "new"} onClick={() => setView("new")} icon={<Plus size={20} />} label="New sale" />
        <NavBtn active={view === "today"} onClick={() => setView("today")} icon={<Clock size={20} />} label="Today" />
        <NavBtn
          active={view === "history"}
          onClick={() => {
            requireOwnerAccess(() => setView("history"));
          }}
          icon={<Receipt size={20} />}
          label="History 🔒"
        />
        <NavBtn
          active={view === "budget"}
          onClick={() => {
            requireOwnerAccess(() => setView("budget"));
          }}
          icon={<Wallet size={20} />}
          label="Budget 🔒"
        />
      </div>

      {showPinModal && (
        <PinModal
          expectedPin={ownerPin}
          onSuccess={() => {
            setIsOwnerUnlocked(true);
            setShowPinModal(false);
            if (pendingAction) {
              pendingAction();
              setPendingAction(null);
            }
          }}
          onClose={() => {
            setShowPinModal(false);
            setPendingAction(null);
          }}
        />
      )}

      {receipt && <ReceiptModal t={receipt} restaurantName={restaurantName} onClose={() => setReceipt(null)} />}
      {dailyReport && <DailyReportModal report={dailyReport} restaurantName={restaurantName} onClose={() => setDailyReport(null)} />}
      {clearing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(20,20,18,0.55)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700 }}>
          Clearing data...
        </div>
      )}
    </div>
  );
}

function PinModal({ expectedPin, onSuccess, onClose }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");

  const handleVerify = () => {
    if (pin === expectedPin) {
      onSuccess();
    } else {
      setErr("Incorrect PIN");
      setPin("");
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(20,20,18,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 100 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 14, padding: 22, width: "100%", maxWidth: 300, textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#F5F6F3", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", color: "#16324A" }}>
          <Lock size={22} />
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, color: "#16324A", marginBottom: 4 }}>Owner PIN Required</div>
        <div style={{ fontSize: 13, color: "#6B6058", marginBottom: 16 }}>Enter 4-digit PIN to access (Default: 1234)</div>

        <input
          type="password"
          maxLength={4}
          autoFocus
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ""))}
          placeholder="••••"
          style={{ width: "100%", boxSizing: "border-box", padding: "12px", borderRadius: 10, border: "1px solid #DEDBD3", fontSize: 24, textAlign: "center", letterSpacing: 8, outline: "none" }}
        />

        {err && <div style={{ color: "#B33A2E", fontSize: 12, marginTop: 8, fontWeight: 600 }}>{err}</div>}

        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px 0", borderRadius: 10, border: "1px solid #DEDBD3", background: "#fff", color: "#6B6058", fontWeight: 600, cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={handleVerify} style={{ flex: 1, padding: "12px 0", borderRadius: 10, border: "none", background: "#16324A", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
            Unlock
          </button>
        </div>
      </div>
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
    <div style={{ display: "flex", gap: 8 }}>
      <div style={{ flex: 1, background: "#fff", borderRadius: 12, padding: "10px 8px", minWidth: 0 }}>
        <div style={{ fontSize: 11, color: "#6B6058", fontWeight: 600 }}>CASH</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#8A5A17", fontFamily: "ui-monospace, Menlo, monospace", wordBreak: "break-all" }}>{money(cash)}</div>
      </div>
      <div style={{ flex: 1, background: "#fff", borderRadius: 12, padding: "10px 8px", minWidth: 0 }}>
        <div style={{ fontSize: 11, color: "#6B6058", fontWeight: 600 }}>M-PESA</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#256B31", fontFamily: "ui-monospace, Menlo, monospace", wordBreak: "break-all" }}>{money(mpesa)}</div>
      </div>
      <div style={{ flex: 1, background: "#16324A", borderRadius: 12, padding: "10px 8px", minWidth: 0 }}>
        <div style={{ fontSize: 11, color: "#B8C6D2", fontWeight: 600 }}>TOTAL · {count}</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: "ui-monospace, Menlo, monospace", wordBreak: "break-all" }}>{money(cash + mpesa)}</div>
      </div>
    </div>
  );
});

const BudgetBar = memo(function BudgetBar({ label, spent, budget, pct, over }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 4 }}>
        <span style={{ fontSize: 12, color: "#6B6058", fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: over ? "#B33A2E" : "#16324A" }}>
          {money(spent)} {budget > 0 ? `/ ${money(budget)}` : ""}
        </span>
      </div>
      {budget > 0 ? (
        <>
          <div style={{ width: "100%", height: 8, background: "#EFEDE7", borderRadius: 6, overflow: "hidden" }}>
            <div
              style={{
                width: `${pct}%`,
                height: "100%",
                background: over ? "#E24B4A" : "#3FA34D",
                borderRadius: 6,
                transition: "width 0.3s",
              }}
            />
          </div>
          {over && (
            <div style={{ fontSize: 12, color: "#B33A2E", marginTop: 4 }}>
              Over budget by {money(spent - budget)}
            </div>
          )}
        </>
      ) : (
        <div style={{ fontSize: 12, color: "#A9A69E" }}>No budget set — tap Edit above.</div>
      )}
    </div>
  );
});

const TxRow = memo(function TxRow({ t, onOpen, onDelete }) {
  const [confirmDel, setConfirmDel] = useState(false);
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
      <div onClick={onOpen} style={{ flex: 1, cursor: "pointer", minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#231F1B", wordBreak: "break-word" }}>
          {t.item} {!t.synced && <span style={{ fontSize: 11, color: "#C9862B", fontWeight: 400 }}>(Pending sync)</span>}
        </div>
        <div style={{ fontSize: 12, color: "#6B6058", marginTop: 2, wordBreak: "break-word" }}>
          {fmtTime(t.time)} · {t.method === "mpesa" ? `M-Pesa · ${t.mpesaCode}` : "Cash"}
          {t.customer ? ` · ${t.customer}` : ""}
        </div>
      </div>
      <div onClick={onOpen} style={{ fontSize: 15, fontWeight: 700, fontFamily: "ui-monospace, Menlo, monospace", color: "#16324A", cursor: "pointer", whiteSpace: "nowrap" }}>
        {money(t.amount)}
      </div>
      {confirmDel ? (
        <button onClick={onDelete} style={{ background: "#E24B4A", border: "none", borderRadius: 8, padding: 8, color: "#fff", cursor: "pointer" }}>
          <Check size={14} />
        </button>
      ) : (
        <button onClick={() => setConfirmDel(true)} style={{ background: "none", border: "none", color: "#B4B2A9", padding: 8, cursor: "pointer" }}>
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
});

const ExpenseRow = memo(function ExpenseRow({ e, onDelete }) {
  const [confirmDel, setConfirmDel] = useState(false);
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#231F1B", wordBreak: "break-word" }}>{e.item}</div>
        <div style={{ fontSize: 12, color: "#6B6058", marginTop: 2 }}>
          {fmtDateHead(todayKey(new Date(e.time)))} · {fmtTime(e.time)}
        </div>
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "ui-monospace, Menlo, monospace", color: "#B33A2E", whiteSpace: "nowrap" }}>
        -{money(e.amount)}
      </div>
      {confirmDel ? (
        <button onClick={onDelete} style={{ background: "#E24B4A", border: "none", borderRadius: 8, padding: 8, color: "#fff", cursor: "pointer" }}>
          <Check size={14} />
        </button>
      ) : (
        <button onClick={() => setConfirmDel(true)} style={{ background: "none", border: "none", color: "#B4B2A9", padding: 8, cursor: "pointer" }}>
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

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12, marginBottom: 6, flexWrap: "wrap" }}>
      <span style={{ color: "#6B6058" }}>{label}</span>
      <span style={{ color: "#231F1B", fontWeight: 700, wordBreak: "break-word", textAlign: "right" }}>{value}</span>
    </div>
  );
}

function ReceiptModal({ t, restaurantName, onClose }) {
  const printRef = useRef();
  const handlePrint = useReactToPrint({ contentRef: printRef });

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20,20,18,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 12,
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center", width: "100%", maxWidth: 360, maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          ref={printRef}
          style={{
            background: "#fff",
            width: "100%",
            boxSizing: "border-box",
            borderRadius: 6,
            padding: "20px 16px 16px",
            fontFamily: "ui-monospace, Menlo, monospace",
            position: "relative",
          }}
        >
          <button onClick={onClose} style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", color: "#B4B2A9", cursor: "pointer" }}>
            <X size={18} />
          </button>

          <div style={{ textAlign: "center", fontFamily: "system-ui, sans-serif", fontWeight: 800, fontSize: 17, color: "#16324A" }}>
            {restaurantName}
          </div>
          <div style={{ textAlign: "center", fontSize: 11, color: "#6B6058", marginTop: 2, fontFamily: "system-ui, sans-serif" }}>
            Sales receipt
          </div>

          <div style={{ borderTop: "1px dashed #CFCCC4", margin: "14px 0" }} />

          <Row label="Date" value={fmtDateHead(todayKey(new Date(t.time)))} />
          <Row label="Time" value={fmtTime(t.time)} />
          <Row label="Item" value={t.item} />
          <Row label="Payment method" value={t.method === "mpesa" ? "M-Pesa" : "Cash"} />
          {t.method === "mpesa" && <Row label="M-Pesa code" value={t.mpesaCode} />}
          {t.customer && <Row label="Customer" value={t.customer} />}

          <div style={{ borderTop: "1px dashed #CFCCC4", margin: "14px 0" }} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 6 }}>
            <span style={{ fontSize: 13, fontFamily: "system-ui, sans-serif", color: "#6B6058", fontWeight: 600 }}>TOTAL</span>
            <span style={{ fontSize: 20, fontWeight: 800 }}>{money(t.amount)}</span>
          </div>

          <div style={{ textAlign: "center", fontSize: 11, color: "#A9A69E", marginTop: 16, fontFamily: "system-ui, sans-serif" }}>
            Thank you for your business!
          </div>
        </div>

        <button onClick={handlePrint} style={{ ...submitBtn, marginTop: 0, background: "#3FA34D" }}>
          Print Receipt
        </button>
      </div>
    </div>
  );
}

function DailyReportModal({ report, restaurantName, onClose }) {
  const printRef = useRef();
  const handlePrint = useReactToPrint({ contentRef: printRef });

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20,20,18,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 12,
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center", width: "100%", maxWidth: 360, maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          ref={printRef}
          style={{
            background: "#fff",
            width: "100%",
            boxSizing: "border-box",
            borderRadius: 6,
            padding: "20px 16px 16px",
            fontFamily: "ui-monospace, Menlo, monospace",
            position: "relative",
            maxHeight: "70vh",
            overflowY: "auto",
          }}
        >
          <button onClick={onClose} style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", color: "#B4B2A9", cursor: "pointer" }}>
            <X size={18} />
          </button>

          <div style={{ textAlign: "center", fontFamily: "system-ui, sans-serif", fontWeight: 800, fontSize: 17, color: "#16324A" }}>
            {restaurantName}
          </div>
          <div style={{ textAlign: "center", fontSize: 11, color: "#6B6058", marginTop: 2, fontFamily: "system-ui, sans-serif" }}>
            Daily Summary Report
          </div>

          <div style={{ borderTop: "1px dashed #CFCCC4", margin: "14px 0" }} />

          <Row label="Date" value={fmtDateHead(report.dateKey)} />
          <Row label="Transactions" value={report.list.length} />
          <Row label="Cash total" value={money(report.cash)} />
          <Row label="M-Pesa total" value={money(report.mpesa)} />

          <div style={{ borderTop: "1px dashed #CFCCC4", margin: "14px 0" }} />

          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, fontFamily: "system-ui, sans-serif" }}>Item Breakdown</div>
          {report.list.map((t, idx) => (
            <div key={idx} style={{ fontSize: 11, marginBottom: 6, display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span style={{ wordBreak: "break-word" }}>{t.item}</span>
              <span style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{money(t.amount)}</span>
            </div>
          ))}

          <div style={{ borderTop: "1px dashed #CFCCC4", margin: "14px 0" }} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 6 }}>
            <span style={{ fontSize: 13, fontFamily: "system-ui, sans-serif", color: "#6B6058", fontWeight: 600 }}>GRAND TOTAL</span>
            <span style={{ fontSize: 20, fontWeight: 800 }}>{money(report.cash + report.mpesa)}</span>
          </div>
        </div>

        <button onClick={handlePrint} style={{ ...submitBtn, marginTop: 0, background: "#3FA34D" }}>
          Print Daily Report
        </button>
      </div>
    </div>
  );
}