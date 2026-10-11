
import { useEffect, useMemo, useState } from "react";
import {
  Sparkles, CheckCircle2, RotateCcw, ShoppingBag, CalendarDays,
  Trophy, LockKeyhole, PiggyBank, Target, Wallet, Plus, Trash2
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import "./MoneyHabits.css";

const missions = [
  {
    id: 1,
    title: "Track your spending",
    description: "Write down every expense you make today.",
    reward: "Build awareness",
    icon: "📝"
  },
  {
    id: 2,
    title: "Try a no-spend day",
    description: "Avoid non-essential purchases for one day.",
    reward: "Practice self-control",
    icon: "🌱"
  },
  {
    id: 3,
    title: "Save before spending",
    description: "Decide how much to save before planning purchases.",
    reward: "Build a habit",
    icon: "🎯"
  }
];

const expenseCategories = [
  "Food", "Transport", "Education", "Shopping", "Bills",
  "Health", "Entertainment", "Other"
];

const colors = [
  "#7567ef", "#f5a623", "#20a779", "#ed7da8",
  "#4397e8", "#ed795f", "#9b75db", "#8c9aa9"
];

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(value) || 0);

const currentMonth = () => new Date().toISOString().slice(0, 7);
const currentDate = () => new Date().toISOString().slice(0, 10);

function readLocalData() {
  try {
    const saved = JSON.parse(localStorage.getItem("mw_habits") || "{}");
    return {
      completedMissions: Array.isArray(saved.completedMissions)
        ? saved.completedMissions : [],
      expenses: Array.isArray(saved.expenses) ? saved.expenses : []
    };
  } catch {
    return { completedMissions: [], expenses: [] };
  }
}

export default function MoneyHabits({
  page,
  transactions = [],
  budgets = [],
  goals = [],
  notify = () => {}
}) {
  const [localData, setLocalData] = useState(readLocalData);
  const [purchaseCost, setPurchaseCost] = useState("200");
  const [savingsAllocation, setSavingsAllocation] = useState("600");
  const [month, setMonth] = useState(currentMonth());

  const [expenseForm, setExpenseForm] = useState({
    amount: "",
    category: "Food",
    title: "",
    date: currentDate()
  });

  useEffect(() => {
    localStorage.setItem("mw_habits", JSON.stringify(localData));
  }, [localData]);

  const completedMissions = localData.completedMissions;
  const savedExpenses = localData.expenses;

  const monthTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const date = transaction.transaction_date || "";
      return date.slice(0, 7) === month && transaction.type === "expense";
    });
  }, [transactions, month]);

  const monthManualExpenses = useMemo(() => {
    return savedExpenses.filter((expense) => expense.date?.slice(0, 7) === month);
  }, [savedExpenses, month]);

  // Avoid counting the same expense twice: this report uses backend
  // transactions plus expenses entered in this feature.
  const allMonthExpenses = useMemo(() => [
    ...monthTransactions.map((transaction) => ({
      id: `transaction-${transaction.id}`,
      title: transaction.title,
      amount: Number(transaction.amount) || 0,
      category: transaction.category || "Other",
      date: transaction.transaction_date,
      source: "transaction"
    })),
    ...monthManualExpenses.map((expense) => ({
      ...expense,
      source: "manual"
    }))
  ], [monthTransactions, monthManualExpenses]);

  const totalSpent = allMonthExpenses.reduce(
    (total, expense) => total + expense.amount, 0
  );

  const monthlyBudgets = budgets.filter((budget) => budget.month === month);
  const plannedBudget = monthlyBudgets.length
    ? monthlyBudgets.reduce(
        (total, budget) => total + (Number(budget.limit_amount) || 0), 0
      )
    : 3000;

  const remaining = plannedBudget - totalSpent;
  const usedPercent = plannedBudget > 0
    ? Math.round((totalSpent / plannedBudget) * 100)
    : 0;

  const categoryTotals = useMemo(() => {
    const totals = {};
    allMonthExpenses.forEach((expense) => {
      const category = expense.category || "Other";
      totals[category] = (totals[category] || 0) + expense.amount;
    });

    return Object.entries(totals).map(([category, total]) => ({
      category,
      total
    }));
  }, [allMonthExpenses]);

  const expenseCount = allMonthExpenses.length;
  const missionsComplete = completedMissions.length === missions.length;
  const hasExpense = transactions.some((item) => item.type === "expense") ||
    savedExpenses.length > 0;
  const hasBudget = budgets.length > 0;
  const hasGoal = goals.length > 0;
  const hasSavingsProgress = goals.some((goal) => Number(goal.saved_amount) > 0);

  const achievements = [
    {
      title: "First Steps",
      description: "Complete your first money mission.",
      icon: "🌱",
      unlocked: completedMissions.length > 0
    },
    {
      title: "Budget Builder",
      description: "Create a monthly budget.",
      icon: "🧮",
      unlocked: hasBudget
    },
    {
      title: "Goal Setter",
      description: "Create a savings goal.",
      icon: "🎯",
      unlocked: hasGoal
    },
    {
      title: "Expense Tracker",
      description: "Record your first expense.",
      icon: "📝",
      unlocked: hasExpense
    },
    {
      title: "Mission Master",
      description: "Complete all three money missions.",
      icon: "🏆",
      unlocked: missionsComplete
    },
    {
      title: "Savings Starter",
      description: "Record progress toward a savings goal.",
      icon: "🐷",
      unlocked: hasSavingsProgress
    }
  ];

  function toggleMission(id) {
    setLocalData((previous) => {
      const completed = previous.completedMissions.includes(id);
      return {
        ...previous,
        completedMissions: completed
          ? previous.completedMissions.filter((missionId) => missionId !== id)
          : [...previous.completedMissions, id]
      };
    });

    notify(
      completedMissions.includes(id)
        ? "Mission marked incomplete."
        : "Mission completed! Keep building good habits."
    );
  }

  function addExpense(event) {
    event.preventDefault();

    const amount = Number(expenseForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      notify("Enter an expense amount greater than zero.");
      return;
    }

    if (!expenseForm.title.trim()) {
      notify("Enter a short description for this expense.");
      return;
    }

    const newExpense = {
      id: `manual-${Date.now()}`,
      amount,
      title: expenseForm.title.trim(),
      category: expenseForm.category,
      date: expenseForm.date
    };

    setLocalData((previous) => ({
      ...previous,
      expenses: [...previous.expenses, newExpense]
    }));

    setMonth(expenseForm.date.slice(0, 7));
    setExpenseForm({
      amount: "",
      category: "Food",
      title: "",
      date: currentDate()
    });

    notify("Expense recorded in this browser.");
  }

  function deleteManualExpense(id) {
    setLocalData((previous) => ({
      ...previous,
      expenses: previous.expenses.filter((expense) => expense.id !== id)
    }));
    notify("Manually entered expense removed.");
  }

  function resetMissionProgress() {
    if (!window.confirm("Reset all three mission completion statuses? Your transactions and budgets will not be deleted.")) {
      return;
    }

    setLocalData((previous) => ({
      ...previous,
      completedMissions: []
    }));
    notify("Mission progress reset.");
  }

  const purchase = Number(purchaseCost);
  const allocation = Number(savingsAllocation);
  const validPurchase = purchaseCost.trim() !== "" &&
    Number.isFinite(purchase) && purchase >= 0;
  const validAllocation = savingsAllocation.trim() !== "" &&
    Number.isFinite(allocation) && allocation >= 0;

  const purchaseDifference = allocation - purchase;

  return (
    <div className="habits-page">
      {page === "Money Missions" && (
        <>
          <section className="habits-hero missions-hero">
            <div>
              <span className="habits-eyebrow">EARN BY DOING</span>
              <h2>Your money missions</h2>
              <p>Small challenges to help turn knowledge into habits.</p>
              <div className="mission-progress">
                <div className="habits-progress-track">
                  <div
                    className="habits-progress-fill"
                    style={{ width: `${completedMissions.length / missions.length * 100}%` }}
                  />
                </div>
                <span>{completedMissions.length} of {missions.length} completed</span>
              </div>
            </div>
            <div className="habits-hero-icon">⚡</div>
          </section>

          <div className="mission-list">
            {missions.map((mission) => {
              const done = completedMissions.includes(mission.id);

              return (
                <section className={`mission-card ${done ? "mission-done" : ""}`} key={mission.id}>
                  <div className="mission-emoji">{mission.icon}</div>
                  <div className="mission-content">
                    <span className="habits-eyebrow">MISSION {String(mission.id).padStart(2, "0")}</span>
                    <h3>{mission.title}</h3>
                    <p>{mission.description}</p>
                    <span className="mission-reward">✦ {mission.reward}</span>
                  </div>
                  <button
                    className={done ? "habits-button secondary" : "habits-button"}
                    onClick={() => toggleMission(mission.id)}
                  >
                    {done ? <><CheckCircle2 size={17} /> Completed — undo</> : "Mark as complete"}
                  </button>
                </section>
              );
            })}
          </div>

          <section className="habits-panel habits-inline-panel">
            <div>
              <h3>Progress belongs to you</h3>
              <p>Mission status is saved in this browser. Completing a mission is for practice, not a financial reward.</p>
            </div>
            <button className="habits-button secondary" onClick={resetMissionProgress}>
              <RotateCcw size={16} /> Reset missions
            </button>
          </section>
        </>
      )}

      {page === "Spending Simulator" && (
        <>
          <section className="habits-hero simulator-hero">
            <div>
              <span className="habits-eyebrow">PAUSE BEFORE YOU PURCHASE</span>
              <h2>Try the spending simulator</h2>
              <p>Explore how a purchase might affect your plans — with pretend money.</p>
            </div>
            <div className="habits-hero-icon">🪙</div>
          </section>

          <div className="simulator-grid">
            <section className="habits-panel">
              <div className="habits-section-title">
                <span className="habits-round-icon"><ShoppingBag size={20} /></span>
                <div>
                  <h3>Is it worth buying right now?</h3>
                  <p>Compare a possible purchase with the amount you planned to save.</p>
                </div>
              </div>

              <label className="habits-label">
                Purchase cost (₹)
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={purchaseCost}
                  onChange={(event) => setPurchaseCost(event.target.value)}
                  placeholder="Enter purchase cost"
                />
              </label>

              <label className="habits-label">
                Suggested savings allocation (₹)
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={savingsAllocation}
                  onChange={(event) => setSavingsAllocation(event.target.value)}
                  placeholder="Enter savings allocation"
                />
              </label>

              <div className="simulator-reminder">
                <ShieldIcon />
                This is a learning exercise. It does not spend money or change your records.
              </div>
            </section>

            <section className="habits-panel scenario-panel">
              <span className="habits-eyebrow">YOUR WHAT-IF SCENARIO</span>
              {validPurchase && validAllocation ? (
                <>
                  <div className="scenario-amount">{money(purchase)}</div>
                  <div className="scenario-comparison">
                    <span>Suggested savings allocation</span>
                    <strong>{money(allocation)}</strong>
                  </div>
                  <div className={`scenario-status ${purchase <= allocation ? "within" : "over"}`}>
                    {purchase <= allocation ? "Within allocation" : "Above allocation"}
                  </div>
                  <p>
                    {purchaseDifference >= 0
                      ? `${money(purchaseDifference)} would remain in this example's allocation.`
                      : `${money(Math.abs(purchaseDifference))} more than this example's allocation would be needed.`}
                  </p>
                  <p className="scenario-advice">
                    Before deciding, consider whether you need it, whether your essential costs are covered,
                    and whether it supports your goals.
                  </p>
                </>
              ) : (
                <p>Enter valid non-negative amounts to compare the purchase with your allocation.</p>
              )}
            </section>
          </div>
        </>
      )}

      {page === "Month-End Review" && (
        <>
          <section className="habits-hero review-hero">
            <div>
              <span className="habits-eyebrow">REFLECT. LEARN. IMPROVE.</span>
              <h2>Month-End Reality Check</h2>
              <p>See where your money went and choose one small improvement for next month.</p>
            </div>
            <div className="habits-hero-icon"><CalendarDays size={54} /></div>
          </section>

          <section className="habits-panel">
            <div className="habits-section-title">
              <span className="habits-round-icon"><Plus size={20} /></span>
              <div>
                <h3>Log an expense</h3>
                <p>Add an expense here or use the dashboard's transaction form.</p>
              </div>
            </div>

            <form className="habits-expense-form" onSubmit={addExpense}>
              <label className="habits-label">
                Amount (₹)
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={expenseForm.amount}
                  onChange={(event) => setExpenseForm({ ...expenseForm, amount: event.target.value })}
                  placeholder="e.g. 120"
                />
              </label>

              <label className="habits-label">
                Category
                <select
                  value={expenseForm.category}
                  onChange={(event) => setExpenseForm({ ...expenseForm, category: event.target.value })}
                >
                  {expenseCategories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </label>

              <label className="habits-label">
                What was it for?
                <input
                  required
                  maxLength="120"
                  value={expenseForm.title}
                  onChange={(event) => setExpenseForm({ ...expenseForm, title: event.target.value })}
                  placeholder="e.g. Lunch at college"
                />
              </label>

              <label className="habits-label">
                Date
                <input
                  type="date"
                  required
                  value={expenseForm.date}
                  onChange={(event) => setExpenseForm({ ...expenseForm, date: event.target.value })}
                />
              </label>

              <button className="habits-button" type="submit">
                <Plus size={17} /> Add expense
              </button>
            </form>

            <p className="habits-disclaimer">
              Expenses entered here are stored in this browser. The report also includes your existing
              recorded expense transactions. Nothing connects to your bank or UPI account.
            </p>
          </section>

          <section className="habits-panel">
            <div className="habits-review-heading">
              <div>
                <span className="habits-eyebrow">MONTHLY OVERVIEW</span>
                <h3>Your month at a glance</h3>
              </div>
              <label className="month-picker">
                Month
                <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
              </label>
            </div>

            <div className="review-metrics">
              <ReviewMetric label="Planned budget" value={money(plannedBudget)} />
              <ReviewMetric label="Recorded spending" value={money(totalSpent)} />
              <ReviewMetric label="Budget remaining" value={money(remaining)} negative={remaining < 0} />
              <ReviewMetric label="Budget used" value={`${usedPercent}%`} />
            </div>

            <div className="habits-progress-track review-budget-track">
              <div
                className={`habits-progress-fill ${usedPercent > 100 ? "budget-over" : ""}`}
                style={{ width: `${Math.min(100, Math.max(0, usedPercent))}%` }}
              />
            </div>

            <div className="reality-check">
              <span>💡</span>
              <div>
                <h4>Your reality check</h4>
                {expenseCount === 0 ? (
                  <p>No expenses recorded for this month yet. Add a few entries to get a meaningful review.</p>
                ) : remaining < 0 ? (
                  <p>Recorded expenses are above the planned budget. Review your categories and choose one realistic adjustment for next month.</p>
                ) : (
                  <p>You have {money(remaining)} remaining against the displayed budget. Consider whether your spending reflects your priorities and savings goals.</p>
                )}
              </div>
            </div>
          </section>

          <div className="review-grid">
            <section className="habits-panel">
              <h3>Spending by category</h3>
              {categoryTotals.length ? (
                <>
                  <div className="review-chart">
                    <ResponsiveContainer width="100%" height={230}>
                      <PieChart>
                        <Pie
                          data={categoryTotals}
                          dataKey="total"
                          nameKey="category"
                          innerRadius={54}
                          outerRadius={82}
                          paddingAngle={3}
                        >
                          {categoryTotals.map((entry, index) => (
                            <Cell key={entry.category} fill={colors[index % colors.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => money(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="category-totals">
                    {categoryTotals.map((entry, index) => (
                      <div className="category-total-row" key={entry.category}>
                        <span className="category-dot" style={{ background: colors[index % colors.length] }} />
                        <span>{entry.category}</span>
                        <strong>{money(entry.total)}</strong>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="habits-empty">Category totals will appear after you add expenses for this month.</p>
              )}
            </section>

            <section className="habits-panel">
              <div className="habits-section-title">
                <span className="habits-round-icon"><Wallet size={19} /></span>
                <div>
                  <h3>Recorded expenses</h3>
                  <p>{expenseCount} entries for {month}</p>
                </div>
              </div>

              {allMonthExpenses.length ? (
                <div className="manual-expense-list">
                  {allMonthExpenses.slice().sort((a, b) => b.date.localeCompare(a.date)).map((expense) => (
                    <div className="manual-expense-row" key={expense.id}>
                      <div className="expense-list-icon">₹</div>
                      <div className="manual-expense-info">
                        <strong>{expense.title}</strong>
                        <span>{expense.category} · {expense.date}{expense.source === "manual" ? " · Browser entry" : " · Transaction"}</span>
                      </div>
                      <strong>{money(expense.amount)}</strong>
                      {expense.source === "manual" && (
                        <button
                          className="habits-delete"
                          title="Remove browser entry"
                          onClick={() => deleteManualExpense(expense.id)}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="habits-empty">No entries for this month.</p>
              )}
            </section>
          </div>
        </>
      )}

      {page === "Achievements" && (
        <>
          <section className="habits-hero achievements-hero">
            <div>
              <span className="habits-eyebrow">EVERY STEP COUNTS</span>
              <h2>Your achievements</h2>
              <p>Build confidence through small, practical money habits.</p>
              <div className="achievement-summary">
                <strong>{achievements.filter((item) => item.unlocked).length} of {achievements.length}</strong>
                <span>achievements unlocked</span>
              </div>
            </div>
            <div className="habits-hero-icon"><Trophy size={58} /></div>
          </section>

          <div className="achievement-grid">
            {achievements.map((achievement) => (
              <section
                className={`achievement-card ${achievement.unlocked ? "achievement-unlocked" : ""}`}
                key={achievement.title}
              >
                <div className="achievement-top">
                  <span className="achievement-emoji">{achievement.icon}</span>
                  {achievement.unlocked
                    ? <span className="achievement-status unlocked">UNLOCKED</span>
                    : <span className="achievement-status locked"><LockKeyhole size={12} /> NOT YET</span>}
                </div>
                <h3>{achievement.title}</h3>
                <p>{achievement.description}</p>
                {!achievement.unlocked && (
                  <div className="achievement-hint">
                    <LockKeyhole size={14} /> Keep going to unlock this badge.
                  </div>
                )}
              </section>
            ))}
          </div>

          <section className="habits-panel achievement-tip">
            <PiggyBank size={25} />
            <div>
              <h3>Progress, not perfection</h3>
              <p>Achievements reflect activity recorded in your account and this browser. They are motivational milestones, not financial rewards.</p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function ReviewMetric({ label, value, negative = false }) {
  return (
    <div className="review-metric">
      <span>{label}</span>
      <strong className={negative ? "negative-value" : ""}>{value}</strong>
    </div>
  );
}

function ShieldIcon() {
  return <span className="simulator-shield">✓</span>;
}
