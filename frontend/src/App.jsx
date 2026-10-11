import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut
} from "firebase/auth";

import { auth as firebaseAuth } from "./firebase";
import { BellRing } from "lucide-react";
import Reminders from "./Reminders";
import MoneyHabits from "./MoneyHabits";
import { Sparkles, ShoppingBag, CalendarDays, Trophy } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  Wallet, TrendingUp, TrendingDown, PiggyBank, Plus,
  Trash2, LogOut, GraduationCap, Target, RefreshCw,
  ArrowUpRight, ArrowDownRight, ShieldCheck
} from "lucide-react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip
} from "recharts";
import { api } from "./api";
import "./App.css";

const money = (n) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 0
}).format(Number(n || 0));

const today = () => new Date().toISOString().slice(0, 10);
const monthNow = () => today().slice(0, 7);
const categories = ["Food", "Transport", "Education", "Shopping", "Bills", "Health", "Entertainment", "Salary", "Freelance", "Other"];

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("mw_token") || "");
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("mw_user") || "null"));
  const [authMode, setAuthMode] = useState("login");
  const [auth, setAuth] = useState({ name: "", email: "", password: "" });
  const [page, setPage] = useState("Dashboard");
  const [dashboard, setDashboard] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [goals, setGoals] = useState([]);
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [quizResult, setQuizResult] = useState(null);
  const [form, setForm] = useState({
    title: "", amount: "", type: "expense", category: "Food",
    payment_method: "UPI", transaction_date: today(), note: ""
  });
  const [budgetForm, setBudgetForm] = useState({
    category: "Food", limit_amount: "", month: monthNow()
  });
  const [goalForm, setGoalForm] = useState({
    title: "", target_amount: "", saved_amount: "0", target_date: ""
  });
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const notify = (message) => {
    setNotice(message);
    setTimeout(() => setNotice(""), 3500);
  };

  const logout = useCallback(async () => {
  try {
    await signOut(firebaseAuth);
  } catch (error) {
    console.error("Firebase sign-out error:", error);
  }

  localStorage.removeItem("mw_token");
  localStorage.removeItem("mw_user");

  setToken("");
  setUser(null);
  setDashboard(null);
  setTransactions([]);
  setBudgets([]);
  setGoals([]);
}, []);

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      const [d, t, b, g] = await Promise.all([
        api("/api/dashboard", { token }),
        api("/api/transactions", { token }),
        api("/api/budgets", { token }),
        api("/api/goals", { token })
      ]);
      setDashboard(d);
      setTransactions(t.transactions);
      setBudgets(b.budgets);
      setGoals(g.goals);
    } catch (error) {
      if (/session|token|log in/i.test(error.message)) logout();
      else notify(error.message);
    }
  }, [token, logout]);

  useEffect(() => {
    if (token) loadData();
  }, [token, loadData]);

  
async function handleAuth(e) {
  e.preventDefault();
  setBusy(true);

  try {
    let credential;

    if (authMode === "register") {
      credential = await createUserWithEmailAndPassword(
        firebaseAuth,
        auth.email.trim(),
        auth.password
      );

      await updateProfile(credential.user, {
        displayName: auth.name.trim(),
      });
    } else {
      credential = await signInWithEmailAndPassword(
        firebaseAuth,
        auth.email.trim(),
        auth.password
      );
    }

    const firebaseUser = credential.user;

    const userData = {
      id: firebaseUser.uid,
      name: firebaseUser.displayName || auth.name.trim() || "Student",
      email: firebaseUser.email,
    };

    localStorage.setItem("mw_user", JSON.stringify(userData));

    // Keep the real Firebase ID token for backend authentication.
    const firebaseToken = await firebaseUser.getIdToken();
    console.log("Firebase email verified:", firebaseUser.emailVerified);

    localStorage.setItem("mw_token", firebaseToken);

    setUser(userData);
    setToken(firebaseToken);

    notify(
      authMode === "register"
        ? "Account created successfully!"
        : "Login successful!"
    );
  } catch (error) {
    console.error("Authentication error:", error);
    notify(error.message || "Authentication failed.");
  } finally {
    setBusy(false);
  }
}

  async function addTransaction(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/transactions", {
        token, method: "POST",
        body: JSON.stringify({ ...form, amount: Number(form.amount) })
      });
      setForm({ title: "", amount: "", type: "expense", category: "Food", payment_method: "UPI", transaction_date: today(), note: "" });
      notify("Transaction added!");
      await loadData();
    } catch (error) {
      notify(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteTransaction(id) {
    if (!confirm("Delete this transaction?")) return;
    try {
      await api(`/api/transactions/${id}`, { token, method: "DELETE" });
      await loadData();
      notify("Transaction deleted.");
    } catch (error) {
      notify(error.message);
    }
  }

  async function saveBudget(e) {
    e.preventDefault();
    try {
      await api("/api/budgets", {
        token, method: "POST",
        body: JSON.stringify({ ...budgetForm, limit_amount: Number(budgetForm.limit_amount) })
      });
      setBudgetForm({ ...budgetForm, limit_amount: "" });
      await loadData();
      notify("Monthly budget saved.");
    } catch (error) {
      notify(error.message);
    }
  }

  async function saveGoal(e) {
    e.preventDefault();
    try {
      await api("/api/goals", {
        token, method: "POST",
        body: JSON.stringify({
          ...goalForm,
          target_amount: Number(goalForm.target_amount),
          saved_amount: Number(goalForm.saved_amount || 0)
        })
      });
      setGoalForm({ title: "", target_amount: "", saved_amount: "0", target_date: "" });
      await loadData();
      notify("Savings goal created.");
    } catch (error) {
      notify(error.message);
    }
  }

  async function updateGoal(goal) {
    const value = prompt(`Enter your updated saved amount (target ${money(goal.target_amount)}):`, String(goal.saved_amount));
    if (value === null) return;
    if (value.trim() === "" || !Number.isFinite(Number(value))) {
      notify("Enter a valid amount.");
      return;
    }
    try {
      await api(`/api/goals/${goal.id}`, {
        token, method: "PATCH",
        body: JSON.stringify({ saved_amount: Number(value) })
      });
      await loadData();
      notify("Savings progress updated.");
    } catch (error) {
      notify(error.message);
    }
  }

  async function deleteGoal(id) {
    if (!confirm("Delete this goal?")) return;
    try {
      await api(`/api/goals/${id}`, { token, method: "DELETE" });
      await loadData();
      notify("Goal deleted.");
    } catch (error) {
      notify(error.message);
    }
  }

  async function startQuiz() {
    try {
      const result = await api("/api/quiz", { token });
      setQuiz(result.questions);
      setAnswers(Array(result.questions.length).fill(-1));
      setQuizResult(null);
      setPage("Money Quiz");
    } catch (error) {
      notify(error.message);
    }
  }

  async function submitQuiz(e) {
    e.preventDefault();
    if (answers.some((a) => a < 0)) {
      notify("Please answer every question.");
      return;
    }
    try {
      const result = await api("/api/quiz/submit", {
        token, method: "POST", body: JSON.stringify({ answers })
      });
      setQuizResult(result);
    } catch (error) {
      notify(error.message);
    }
  }

  if (!token) {
    return (
      <div className="auth-screen">
        <div className="auth-art">
          <div className="brand"><span className="brand-icon"><Wallet /></span> MoneyWise</div>
          <div className="art-copy">
            <span className="eyebrow">YOUR MONEY. YOUR FUTURE.</span>
            <h1>Small steps.<br /><span>Smarter money.</span></h1>
            <p>A simple personal finance space built for students. Track spending, plan your budget and build better money habits.</p>
            <div className="art-stats">
              <div><strong>Track</strong><small>Every rupee</small></div>
              <div><strong>Plan</strong><small>Monthly budgets</small></div>
              <div><strong>Grow</strong><small>Money skills</small></div>
            </div>
          </div>
          <div className="art-foot">A learning project for financial confidence.</div>
        </div>
        <div className="auth-panel">
          <form className="auth-form" onSubmit={handleAuth}>
            <div className="mobile-brand"><Wallet /> MoneyWise</div>
            <span className="eyebrow">STUDENT FINANCE, SIMPLIFIED</span>
            <h2>{authMode === "login" ? "Welcome back!" : "Create your account"}</h2>
            <p className="muted">{authMode === "login" ? "Log in to your personal finance space." : "Start building smarter money habits today."}</p>
            {authMode === "register" && <label>Full name<input required maxLength="80" value={auth.name} onChange={e => setAuth({ ...auth, name: e.target.value })} placeholder="Your name" /></label>}
            <label>Email address<input type="email" required value={auth.email} onChange={e => setAuth({ ...auth, email: e.target.value })} placeholder="you@example.com" /></label>
            <label>Password<input type="password" required minLength="8" maxLength="128" value={auth.password} onChange={e => setAuth({ ...auth, password: e.target.value })} placeholder="At least 8 characters" /></label>
            <button className="primary full" disabled={busy}>{busy ? "Please wait..." : authMode === "login" ? "Log in to MoneyWise" : "Create account"} <ArrowUpRight size={17} /></button>
            <p className="switch-auth">{authMode === "login" ? "New here?" : "Already have an account?"} <button type="button" className="link-button" onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}>{authMode === "login" ? "Create an account" : "Log in"}</button></p>
            <div className="safe-note"><ShieldCheck size={17} /> Your finance records are private to your account. Never enter banking passwords, UPI PINs or OTPs.</div>
          </form>
        </div>
        {notice && <div className="toast">{notice}</div>}
      </div>
    );
  }

 
const nav = [
  ["Dashboard", Wallet],
  ["Transactions", TrendingUp],
  ["Budgets", Target],
  ["Savings Goals", PiggyBank],
  ["Money Missions", Sparkles],
  ["Spending Simulator", ShoppingBag],
  ["Month-End Review", CalendarDays],
  ["Achievements", Trophy],
  ["Money Quiz", GraduationCap],
  ["Reminders", BellRing],
];


  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-icon"><Wallet /></span> MoneyWise</div>
        <div className="side-caption">YOUR FINANCE SPACE</div>
        <nav>{nav.map(([name, Icon]) => <button key={name} className={`nav-item ${page === name ? "active" : ""}`} onClick={() => name === "Money Quiz" ? startQuiz() : setPage(name)}><Icon size={18} />{name}</button>)}</nav>
        <div className="sidebar-bottom"><div className="profile"><div className="avatar">{(user?.name || "S").slice(0, 1).toUpperCase()}</div><div><strong>{user?.name || "Student"}</strong><small>Student account</small></div></div><button className="logout" onClick={logout}><LogOut size={17} /> Log out</button></div>
      </aside>

      <main className="main-area">
        <header className="topbar"><div><span className="eyebrow">YOUR PERSONAL FINANCE SPACE</span><h1>{page}</h1></div><div className="top-actions"><span className="today-label">{new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span><button className="icon-button" title="Refresh" onClick={loadData}><RefreshCw size={18} /></button><div className="avatar">{(user?.name || "S").slice(0, 1).toUpperCase()}</div></div></header>

        {notice && <div className="toast inline-toast">{notice}</div>}

        {page === "Dashboard" && dashboard && <div className="page-content">
          <section className="welcome-banner"><div><span className="eyebrow light">YOUR MONEY, YOUR RULES</span><h2>Hey, {user?.name?.split(" ")[0] || "student"}! ✦</h2><p>Your money journey starts with one small decision.</p></div><div className="banner-icon"><PiggyBank size={72} /></div></section>
          <div className="metric-grid">
            <Metric icon={<TrendingUp />} label="Monthly Income" value={money(dashboard.income)} color="green" foot="Money received this month" />
            <Metric icon={<TrendingDown />} label="Monthly Expenses" value={money(dashboard.expenses)} color="red" foot="Money spent this month" />
            <Metric icon={<Wallet />} label="Net Savings" value={money(dashboard.savings)} color="purple" foot="Income minus expenses" />
            <Metric icon={<Target />} label="Budget Remaining" value={money(dashboard.budgetRemaining)} color="orange" foot="Against your monthly budget" />
          </div>
          <div className="content-grid">
            <section className="panel"><div className="panel-heading"><div><h3>Spending overview</h3><p>Where your money went this month</p></div><span className="soft-tag">{dashboard.month}</span></div>
              {dashboard.categoryTotals.length ? <div className="chart-wrap"><ResponsiveContainer width="100%" height={245}><PieChart><Pie data={dashboard.categoryTotals} dataKey="total" nameKey="category" innerRadius={65} outerRadius={94} paddingAngle={4}>{dashboard.categoryTotals.map((entry, i) => <Cell key={entry.category} fill={["#6c63ff", "#f59e0b", "#16a34a", "#f472b6", "#0ea5e9", "#fb7185", "#8b5cf6"][i % 7]} />)}</Pie><Tooltip formatter={(value) => money(value)} /></PieChart></ResponsiveContainer><div className="legend">{dashboard.categoryTotals.slice(0, 6).map((item, i) => <span key={item.category}><i style={{ background: ["#6c63ff", "#f59e0b", "#16a34a", "#f472b6", "#0ea5e9", "#fb7185"][i % 6] }} />{item.category}<b>{money(item.total)}</b></span>)}</div></div> : <Empty icon={<TrendingDown />} title="No spending data yet" text="Add your first transaction to see your spending breakdown." />}
            </section>
            <section className="panel"><div className="panel-heading"><div><h3>Quick add</h3><p>Record money in or money out</p></div><span className="soft-tag">INR ₹</span></div>
              <form className="stack-form" onSubmit={addTransaction}>
                <div className="type-toggle"><button type="button" className={form.type === "expense" ? "selected expense" : ""} onClick={() => setForm({ ...form, type: "expense", category: "Food" })}>Expense</button><button type="button" className={form.type === "income" ? "selected income" : ""} onClick={() => setForm({ ...form, type: "income", category: "Salary" })}>Income</button></div>
                <label>Title<input required maxLength="120" placeholder="e.g. Lunch at college" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></label>
                <div className="form-row"><label>Amount (₹)<input type="number" min="0.01" step="0.01" required placeholder="250" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></label><label>Category<select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{categories.filter(c => form.type === "income" ? ["Salary", "Freelance", "Other"].includes(c) : !["Salary", "Freelance"].includes(c)).map(c => <option key={c}>{c}</option>)}</select></label></div>
                <div className="form-row"><label>Date<input type="date" required value={form.transaction_date} onChange={e => setForm({ ...form, transaction_date: e.target.value })} /></label><label>Payment method<select value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })}>{["UPI", "Cash", "Card", "Bank Transfer", "Other"].map(c => <option key={c}>{c}</option>)}</select></label></div>
                <button className="primary" disabled={busy}><Plus size={17} /> Add transaction</button>
              </form>
            </section>
          </div>
          <section className="panel"><div className="panel-heading"><div><h3>Recent transactions</h3><p>Your latest money activity</p></div><button className="text-button" onClick={() => setPage("Transactions")}>View all <ArrowUpRight size={15} /></button></div><TransactionTable rows={dashboard.recentTransactions} onDelete={deleteTransaction} /></section>
          <div className="bottom-grid"><section className="tip-card"><span className="tip-symbol">✦</span><div><span className="eyebrow">MONEY TIP OF THE DAY</span><h3>Give every rupee a purpose.</h3><p>Try setting a realistic weekly spending limit. Small, consistent choices can help you understand your habits.</p></div></section><section className="panel savings-mini"><div className="panel-heading"><div><h3>Savings goals</h3><p>Keep your future in focus</p></div><button className="text-button" onClick={() => setPage("Savings Goals")}>View goals →</button></div>{goals.length ? goals.slice(0, 2).map(g => <GoalProgress key={g.id} goal={g} />) : <Empty icon={<PiggyBank />} title="No goals yet" text="Create a goal to track your progress." />}</section></div>
        </div>}
        {[
  "Money Missions",
  "Spending Simulator",
  "Month-End Review",
  "Achievements"
].includes(page) && (
  <div className="page-content">
    <MoneyHabits
      page={page}
      transactions={transactions}
      budgets={budgets}
      goals={goals}
      notify={notify}
    />
  </div>
)}

        {page === "Transactions" && <div className="page-content"><section className="panel"><div className="panel-heading"><div><h3>All transactions</h3><p>Your recorded income and expenses</p></div><span className="soft-tag">{transactions.length} records</span></div><TransactionTable rows={transactions} onDelete={deleteTransaction} /></section><section className="panel"><div className="panel-heading"><div><h3>Add a transaction</h3><p>Use the quick-add form on the dashboard.</p></div><button className="primary" onClick={() => setPage("Dashboard")}>Go to quick add</button></div></section></div>}

        {page === "Budgets" && <div className="page-content"><section className="panel"><div className="panel-heading"><div><h3>Monthly budgets</h3><p>Set limits and compare them with your spending.</p></div></div><form className="inline-form" onSubmit={saveBudget}><label>Month<input type="month" required value={budgetForm.month} onChange={e => setBudgetForm({ ...budgetForm, month: e.target.value })} /></label><label>Category<select value={budgetForm.category} onChange={e => setBudgetForm({ ...budgetForm, category: e.target.value })}>{categories.filter(c => !["Salary", "Freelance"].includes(c)).map(c => <option key={c}>{c}</option>)}</select></label><label>Limit (₹)<input type="number" min="1" step="0.01" required value={budgetForm.limit_amount} onChange={e => setBudgetForm({ ...budgetForm, limit_amount: e.target.value })} placeholder="3000" /></label><button className="primary"><Plus size={16} /> Save budget</button></form></section><div className="budget-grid">{budgets.map(b => <section className="panel" key={b.id}><div className="budget-title"><span>{b.category}</span><button className="icon-button danger" onClick={async () => { try { await api(`/api/budgets/${b.id}`, { token, method: "DELETE" }); await loadData(); } catch (e) { notify(e.message); } }}><Trash2 size={16} /></button></div><h2>{money(b.spent)} <small>of {money(b.limit_amount)}</small></h2><div className="progress-track"><div className={`progress-fill ${b.spent > b.limit_amount ? "over" : ""}`} style={{ width: `${Math.min(100, b.spent / b.limit_amount * 100)}%` }} /></div><p className="muted">{b.spent > b.limit_amount ? `${money(b.spent - b.limit_amount)} over budget` : `${money(b.limit_amount - b.spent)} remaining`}</p></section>)}{!budgets.length && <section className="panel"><Empty icon={<Target />} title="Start with one category" text="Set a monthly limit above. Your expense transactions update the progress automatically." /></section>}</div></div>}

        {page === "Savings Goals" && <div className="page-content"><section className="panel"><div className="panel-heading"><div><h3>Create a savings goal</h3><p>Track something you're saving towards.</p></div></div><form className="inline-form" onSubmit={saveGoal}><label>Goal title<input required maxLength="120" value={goalForm.title} onChange={e => setGoalForm({ ...goalForm, title: e.target.value })} placeholder="e.g. New laptop" /></label><label>Target (₹)<input type="number" min="1" required value={goalForm.target_amount} onChange={e => setGoalForm({ ...goalForm, target_amount: e.target.value })} placeholder="40000" /></label><label>Already saved (₹)<input type="number" min="0" required value={goalForm.saved_amount} onChange={e => setGoalForm({ ...goalForm, saved_amount: e.target.value })} /></label><label>Target date<input type="date" value={goalForm.target_date} onChange={e => setGoalForm({ ...goalForm, target_date: e.target.value })} /></label><button className="primary"><Plus size={16} /> Create goal</button></form></section><div className="goal-grid">{goals.map(goal => <section className="panel goal-card" key={goal.id}><div className="goal-icon"><PiggyBank /></div><div className="budget-title"><h3>{goal.title}</h3><button className="icon-button danger" onClick={() => deleteGoal(goal.id)}><Trash2 size={16} /></button></div><h2>{money(goal.saved_amount)} <small>of {money(goal.target_amount)}</small></h2><div className="progress-track"><div className="progress-fill" style={{ width: `${goal.progress}%` }} /></div><div className="goal-footer"><span>{goal.progress}% saved</span><button className="text-button" onClick={() => updateGoal(goal)}>Update progress</button></div>{goal.target_date && <p className="muted">Target date: {goal.target_date}</p>}</section>)}{!goals.length && <section className="panel"><Empty icon={<PiggyBank />} title="Every goal starts somewhere" text="Create your first goal above and update it as you save." /></section>}</div></div>}

        {page === "Money Quiz" && <div className="page-content"><section className="quiz-hero"><GraduationCap size={42} /><div><h2>Money-smart starts here.</h2><p>Learn practical personal finance and digital payment safety.</p></div></section>{!quiz && <section className="panel"><button className="primary" onClick={startQuiz}>Start financial literacy quiz</button></section>}{quiz && !quizResult && <form onSubmit={submitQuiz}>{quiz.map((q, i) => <section className="panel quiz-question" key={q.question}><span className="eyebrow">QUESTION {i + 1} OF {quiz.length}</span><h3>{q.question}</h3>{q.options.map((option, j) => <label className={`quiz-option ${answers[i] === j ? "chosen" : ""}`} key={option}><input type="radio" name={`question-${i}`} checked={answers[i] === j} onChange={() => setAnswers(answers.map((a, k) => k === i ? j : a))} /><span>{option}</span></label>)}</section>)}<button className="primary" type="submit">Submit answers</button></form>}{quizResult && <section className="panel quiz-results"><div className="score-circle">{quizResult.percentage}%</div><h2>{quizResult.score} out of {quizResult.total} correct</h2><p>Every quiz is a chance to build your money confidence.</p>{quizResult.details.map((d, i) => <div className="quiz-feedback" key={i}><strong>{i + 1}. {d.correct ? "Correct" : "Review this answer"}</strong><p>{d.explanation}</p><small>Answer: {d.correctAnswer}</small></div>)}<button className="primary" onClick={startQuiz}>Try again</button></section>}</div>}


          {page === "Reminders" && (
            <Reminders
              userKey={user?.email || user?.id || "student"}
            />
          )}

          {!dashboard && page === "Dashboard" && (
            <section className="panel">
              <p>Loading your dashboard…</p>
            </section>
          )}

        <footer className="app-footer">MoneyWise · A student finance education project · Demo data stays in your local database.</footer>
      </main>
    </div>
  );
}

function Metric({ icon, label, value, color, foot }) {
  return <section className="metric-card"><div className={`metric-icon ${color}`}>{icon}</div><span className="metric-label">{label}</span><strong className="metric-value">{value}</strong><small>{foot}</small></section>;
}

function Empty({ icon, title, text }) {
  return <div className="empty-state"><span>{icon}</span><strong>{title}</strong><p>{text}</p></div>;
}

function GoalProgress({ goal }) {
  return <div className="mini-goal"><div><strong>{goal.title}</strong><span>{money(goal.saved_amount)} / {money(goal.target_amount)}</span></div><div className="progress-track"><div className="progress-fill" style={{ width: `${goal.progress}%` }} /></div></div>;
}

function TransactionTable({ rows, onDelete }) {
  if (!rows?.length) return <Empty icon={<Wallet />} title="No transactions yet" text="Add income or an expense to start building your money history." />;
  return <div className="table-wrap"><table><thead><tr><th>Transaction</th><th>Category</th><th>Date</th><th>Amount</th><th></th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td><div className="transaction-name"><span className={`transaction-symbol ${row.type}`}>{row.type === "income" ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}</span><div><strong>{row.title}</strong><small>{row.payment_method}</small></div></div></td><td><span className="category-tag">{row.category}</span></td><td>{row.transaction_date}</td><td className={row.type === "income" ? "amount-in" : "amount-out"}>{row.type === "income" ? "+" : "−"}{money(row.amount)}</td><td><button className="icon-button danger" title="Delete" onClick={() => onDelete(row.id)}><Trash2 size={16} /></button></td></tr>)}</tbody></table></div>;
}
