require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const db = require("./db");

const serviceAccount = require("./serviceAccountKey.json");

const firebaseApp = initializeApp({
  credential: cert(serviceAccount),
});

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error("Missing JWT_SECRET in .env file.");
  process.exit(1);
}

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// ---------- Helper functions ----------

function createToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function validAmount(amount) {
  return typeof amount === "number" &&
    Number.isFinite(amount) &&
    amount > 0;
}

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function validDate(date) {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  const parsed = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date;
}

// ---------- Firebase authentication middleware ----------

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Please log in first.",
    });
  }

  const token = header.slice(7).trim();

  if (!token) {
    return res.status(401).json({
      message: "Please log in first.",
    });
  }

  try {
    // Verify the Firebase ID token using the modular Admin SDK API.
    const decoded = await getAuth(firebaseApp).verifyIdToken(token);

    if (!decoded.email) {
      return res.status(401).json({
        message: "Your Firebase account must have an email address.",
      });
    }

    // Only associate an existing local account when Firebase confirms
    // the email is verified. New Firebase users get a local DB record.
    const email = decoded.email.trim().toLowerCase();

    let user = db.prepare(
      "SELECT id, name, email FROM users WHERE email = ?"
    ).get(email);

    if (!user) {
      const name =
        typeof decoded.name === "string" && decoded.name.trim()
          ? decoded.name.trim().slice(0, 80)
          : email.split("@")[0].slice(0, 80);

      const randomPassword = crypto.randomBytes(32).toString("hex");
      const hashedPassword = bcrypt.hashSync(randomPassword, 12);

      const result = db.prepare(
        "INSERT INTO users (name, email, password) VALUES (?, ?, ?)"
      ).run(name, email, hashedPassword);

      user = {
        id: Number(result.lastInsertRowid),
        name,
        email,
      };
    }

    req.user = {
      id: user.id,
      email: user.email,
      firebaseUid: decoded.uid,
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error.code || error.message);

    return res.status(401).json({
      message: "Your session is invalid or expired. Please log in again.",
    });
  }
}

// ---------- Health check ----------

app.get("/", (req, res) => {
  res.json({
    app: "MoneyWise API",
    status: "running",
    message: "Your student finance backend is working.",
  });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", database: "SQLite" });
});

// ---------- Legacy email/password authentication ----------
// These routes issue JWTs, not Firebase ID tokens.
// The Firebase-protected finance routes below require Firebase login.

app.post("/api/auth/register", (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      name.trim().length > 80 ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        message: "Enter your name, email, and password.",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }

    if (password.length < 8 || password.length > 128) {
      return res.status(400).json({
        message: "Password must be between 8 and 128 characters.",
      });
    }

    const existing = db.prepare(
      "SELECT id FROM users WHERE email = ?"
    ).get(cleanEmail);

    if (existing) {
      return res.status(409).json({
        message: "This email is already registered. Please log in.",
      });
    }

    const hashedPassword = bcrypt.hashSync(password, 12);

    const result = db.prepare(
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)"
    ).run(name.trim(), cleanEmail, hashedPassword);

    const user = {
      id: Number(result.lastInsertRowid),
      name: name.trim(),
      email: cleanEmail,
    };

    res.status(201).json({
      message: "Account created successfully!",
      token: createToken(user),
      user,
    });
  } catch (error) {
    console.error("Registration error:", error.message);
    res.status(500).json({ message: "Could not create your account." });
  }
});

app.post("/api/auth/login", (req, res) => {
  try {
    const { email, password } = req.body;

    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ message: "Enter email and password." });
    }

    const user = db.prepare(
      "SELECT id, name, email, password FROM users WHERE email = ?"
    ).get(email.trim().toLowerCase());

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    res.json({
      message: "Login successful!",
      token: createToken(user),
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ message: "Could not log in." });
  }
});

// Firebase ID tokens are required for this endpoint.
app.get("/api/auth/me", authMiddleware, (req, res) => {
  const user = db.prepare(
    "SELECT id, name, email, created_at FROM users WHERE id = ?"
  ).get(req.user.id);

  if (!user) {
    return res.status(404).json({ message: "Account not found." });
  }

  res.json({ user });
});

// All finance APIs below require a valid Firebase ID token.
app.use("/api", authMiddleware);

// ---------- Dashboard ----------

app.get("/api/dashboard", (req, res) => {
  const userId = req.user.id;

  const month =
    typeof req.query.month === "string" &&
    /^\d{4}-\d{2}$/.test(req.query.month)
      ? req.query.month
      : currentMonth();

  const totals = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expenses
    FROM transactions
    WHERE user_id = ? AND substr(transaction_date, 1, 7) = ?
  `).get(userId, month);

  const budgetRow = db.prepare(`
    SELECT COALESCE(SUM(limit_amount), 0) AS total
    FROM budgets WHERE user_id = ? AND month = ?
  `).get(userId, month);

  const recentTransactions = db.prepare(`
    SELECT id, title, amount, type, category, payment_method,
           transaction_date, note
    FROM transactions
    WHERE user_id = ?
    ORDER BY transaction_date DESC, id DESC
    LIMIT 5
  `).all(userId);

  const categoryTotals = db.prepare(`
    SELECT category, SUM(amount) AS total
    FROM transactions
    WHERE user_id = ? AND type = 'expense'
      AND substr(transaction_date, 1, 7) = ?
    GROUP BY category
    ORDER BY total DESC
  `).all(userId, month);

  const income = totals.income;
  const expenses = totals.expenses;

  res.json({
    month,
    income,
    expenses,
    savings: income - expenses,
    savingsRate: income > 0
      ? Math.round(((income - expenses) / income) * 100)
      : 0,
    budgetLimit: budgetRow.total,
    budgetRemaining: budgetRow.total - expenses,
    recentTransactions,
    categoryTotals,
  });
});

// ---------- Transactions ----------

app.get("/api/transactions", (req, res) => {
  const transactions = db.prepare(`
    SELECT id, title, amount, type, category, payment_method,
           transaction_date, note
    FROM transactions
    WHERE user_id = ?
    ORDER BY transaction_date DESC, id DESC
  `).all(req.user.id);

  res.json({ transactions });
});

app.post("/api/transactions", (req, res) => {
  const {
    title,
    amount,
    type,
    category,
    payment_method,
    transaction_date,
    note,
  } = req.body;

  if (
    typeof title !== "string" ||
    !title.trim() ||
    title.trim().length > 120 ||
    !validAmount(amount) ||
    !["income", "expense"].includes(type) ||
    typeof category !== "string" ||
    !category.trim() ||
    category.trim().length > 60 ||
    !validDate(transaction_date)
  ) {
    return res.status(400).json({
      message: "Check the title, amount, type, category, and date.",
    });
  }

  const methods = ["UPI", "Cash", "Card", "Bank Transfer", "Other"];
  const method = methods.includes(payment_method) ? payment_method : "UPI";
  const safeNote = typeof note === "string" ? note.slice(0, 500) : "";

  const result = db.prepare(`
    INSERT INTO transactions
      (user_id, title, amount, type, category, payment_method, transaction_date, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.user.id,
    title.trim(),
    amount,
    type,
    category.trim(),
    method,
    transaction_date,
    safeNote
  );

  const transaction = db.prepare(`
    SELECT id, title, amount, type, category, payment_method,
           transaction_date, note
    FROM transactions WHERE id = ? AND user_id = ?
  `).get(result.lastInsertRowid, req.user.id);

  res.status(201).json({
    message: "Transaction added successfully.",
    transaction,
  });
});

app.delete("/api/transactions/:id", (req, res) => {
  const result = db.prepare(
    "DELETE FROM transactions WHERE id = ? AND user_id = ?"
  ).run(Number(req.params.id), req.user.id);

  if (!result.changes) {
    return res.status(404).json({ message: "Transaction not found." });
  }

  res.json({ message: "Transaction deleted." });
});

// ---------- Budgets ----------

app.get("/api/budgets", (req, res) => {
  const month =
    typeof req.query.month === "string" &&
    /^\d{4}-\d{2}$/.test(req.query.month)
      ? req.query.month
      : currentMonth();

  const budgets = db.prepare(`
    SELECT b.id, b.month, b.category, b.limit_amount,
      COALESCE((
        SELECT SUM(t.amount)
        FROM transactions t
        WHERE t.user_id = b.user_id
          AND t.type = 'expense'
          AND t.category = b.category
          AND substr(t.transaction_date, 1, 7) = b.month
      ), 0) AS spent
    FROM budgets b
    WHERE b.user_id = ? AND b.month = ?
    ORDER BY b.category
  `).all(req.user.id, month);

  res.json({ month, budgets });
});

app.post("/api/budgets", (req, res) => {
  const { month, category, limit_amount } = req.body;

  if (
    typeof month !== "string" ||
    !/^\d{4}-\d{2}$/.test(month) ||
    typeof category !== "string" ||
    !category.trim() ||
    category.trim().length > 60 ||
    !validAmount(limit_amount)
  ) {
    return res.status(400).json({
      message: "Enter a valid month, category, and positive budget amount.",
    });
  }

  db.prepare(`
    INSERT INTO budgets (user_id, month, category, limit_amount)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, month, category)
    DO UPDATE SET limit_amount = excluded.limit_amount
  `).run(req.user.id, month, category.trim(), limit_amount);

  res.status(201).json({ message: "Budget saved successfully." });
});

app.delete("/api/budgets/:id", (req, res) => {
  const result = db.prepare(
    "DELETE FROM budgets WHERE id = ? AND user_id = ?"
  ).run(Number(req.params.id), req.user.id);

  if (!result.changes) {
    return res.status(404).json({ message: "Budget not found." });
  }

  res.json({ message: "Budget deleted." });
});

// ---------- Savings goals ----------

app.get("/api/goals", (req, res) => {
  const goals = db.prepare(`
    SELECT id, title, target_amount, saved_amount, target_date
    FROM savings_goals
    WHERE user_id = ?
    ORDER BY id DESC
  `).all(req.user.id);

  res.json({
    goals: goals.map((goal) => ({
      ...goal,
      progress: goal.target_amount > 0
        ? Math.min(100, Math.round(
            (goal.saved_amount / goal.target_amount) * 100
          ))
        : 0,
    })),
  });
});

app.post("/api/goals", (req, res) => {
  const { title, target_amount, saved_amount, target_date } = req.body;

  if (
    typeof title !== "string" ||
    !title.trim() ||
    title.trim().length > 120 ||
    !validAmount(target_amount) ||
    (saved_amount !== undefined &&
      (typeof saved_amount !== "number" ||
        !Number.isFinite(saved_amount) ||
        saved_amount < 0 ||
        saved_amount > target_amount)) ||
    (target_date && !validDate(target_date))
  ) {
    return res.status(400).json({
      message: "Enter a valid goal title, target, saved amount, and date.",
    });
  }

  const result = db.prepare(`
    INSERT INTO savings_goals
      (user_id, title, target_amount, saved_amount, target_date)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    req.user.id,
    title.trim(),
    target_amount,
    saved_amount ?? 0,
    target_date || null
  );

  res.status(201).json({
    message: "Savings goal created.",
    id: Number(result.lastInsertRowid),
  });
});

app.patch("/api/goals/:id", (req, res) => {
  const { saved_amount } = req.body;

  if (
    typeof saved_amount !== "number" ||
    !Number.isFinite(saved_amount) ||
    saved_amount < 0
  ) {
    return res.status(400).json({ message: "Enter a valid saved amount." });
  }

  const goal = db.prepare(`
    SELECT target_amount
    FROM savings_goals
    WHERE id = ? AND user_id = ?
  `).get(Number(req.params.id), req.user.id);

  if (!goal) {
    return res.status(404).json({ message: "Savings goal not found." });
  }

  if (saved_amount > goal.target_amount) {
    return res.status(400).json({
      message: "Saved amount cannot exceed the target amount.",
    });
  }

  db.prepare(`
    UPDATE savings_goals SET saved_amount = ?
    WHERE id = ? AND user_id = ?
  `).run(saved_amount, Number(req.params.id), req.user.id);

  res.json({ message: "Savings progress updated." });
});

app.delete("/api/goals/:id", (req, res) => {
  const result = db.prepare(
    "DELETE FROM savings_goals WHERE id = ? AND user_id = ?"
  ).run(Number(req.params.id), req.user.id);

  if (!result.changes) {
    return res.status(404).json({ message: "Savings goal not found." });
  }

  res.json({ message: "Savings goal deleted." });
});

// ---------- Financial literacy quiz ----------

const quizQuestions = [
  {
    question: "What is a budget?",
    options: [
      "A plan for income and expenses",
      "A type of bank card",
      "A guaranteed investment return",
      "A loan application",
    ],
    answer: 0,
    explanation: "A budget helps you plan how money will be earned, spent, and saved.",
  },
  {
    question: "What should you do if someone asks for your UPI PIN to receive money?",
    options: [
      "Share it if they seem trustworthy",
      "Send your OTP too",
      "Never share it; a UPI PIN is not needed to receive money",
      "Post it in a group",
    ],
    answer: 2,
    explanation: "Never share your UPI PIN or OTP. You do not need your PIN to receive money.",
  },
  {
    question: "You receive ₹1,000 and spend ₹650. How much remains?",
    options: ["₹250", "₹350", "₹450", "₹650"],
    answer: 1,
    explanation: "₹1,000 minus ₹650 leaves ₹350.",
  },
  {
    question: "What is an emergency fund for?",
    options: [
      "Everyday impulse purchases",
      "Unexpected expenses",
      "Guaranteed profit",
      "Avoiding all budgeting",
    ],
    answer: 1,
    explanation: "An emergency fund can help cover unexpected costs.",
  },
  {
    question: "Which is the safest response to a suspicious payment link?",
    options: [
      "Open it immediately",
      "Forward it to friends",
      "Enter your banking password",
      "Verify the source independently before taking action",
    ],
    answer: 3,
    explanation: "Check the sender and use official apps or websites instead of trusting unexpected links.",
  },
];

app.get("/api/quiz", (req, res) => {
  res.json({
    questions: quizQuestions.map(({ question, options }) => ({
      question,
      options,
    })),
  });
});

app.post("/api/quiz/submit", (req, res) => {
  const { answers } = req.body;

  if (
    !Array.isArray(answers) ||
    answers.length !== quizQuestions.length ||
    answers.some((answer) => !Number.isInteger(answer))
  ) {
    return res.status(400).json({
      message: "Submit an answer for every question.",
    });
  }

  const details = quizQuestions.map((question, index) => ({
    question: question.question,
    correct: answers[index] === question.answer,
    correctAnswer: question.options[question.answer],
    explanation: question.explanation,
  }));

  const score = details.filter((item) => item.correct).length;

  db.prepare(`
    INSERT INTO quiz_results (user_id, score, total)
    VALUES (?, ?, ?)
  `).run(req.user.id, score, quizQuestions.length);

  res.json({
    score,
    total: quizQuestions.length,
    percentage: Math.round((score / quizQuestions.length) * 100),
    details,
  });
});

app.get("/api/quiz/history", (req, res) => {
  const results = db.prepare(`
    SELECT id, score, total, completed_at
    FROM quiz_results
    WHERE user_id = ?
    ORDER BY id DESC
    LIMIT 10
  `).all(req.user.id);

  res.json({ results });
});

// ---------- Daily activity ----------

app.post("/api/activity/check-in", (req, res) => {
  const today = new Date().toISOString().slice(0, 10);

  db.prepare(`
    INSERT OR IGNORE INTO daily_activity (user_id, activity_date)
    VALUES (?, ?)
  `).run(req.user.id, today);

  const dates = db.prepare(`
    SELECT activity_date FROM daily_activity
    WHERE user_id = ?
    ORDER BY activity_date DESC
  `).all(req.user.id).map((row) => row.activity_date);

  let streak = 0;
  const date = new Date(`${today}T00:00:00Z`);

  if (!dates.includes(today)) {
    date.setUTCDate(date.getUTCDate() - 1);
  }

  for (const activityDate of dates) {
    const expected = date.toISOString().slice(0, 10);
    if (activityDate !== expected) break;

    streak++;
    date.setUTCDate(date.getUTCDate() - 1);
  }

  res.json({
    message: "Daily learning activity recorded.",
    streak,
  });
});

// ---------- Not found and errors ----------

app.use((req, res) => {
  res.status(404).json({ message: "API route not found." });
});

app.use((error, req, res, next) => {
  console.error("Server error:", error.message);

  if (res.headersSent) {
    return next(error);
  }

  res.status(500).json({
    message: "An unexpected server error occurred.",
  });
});

// ---------- Start server ----------

app.listen(PORT, () => {
  console.log(`MoneyWise API is running at http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
