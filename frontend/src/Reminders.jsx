
import { useEffect, useMemo, useState } from "react";
import {
  BellRing,
  CalendarDays,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  Wallet
} from "lucide-react";
import "./Reminders.css";

const STORAGE_PREFIX = "moneywise_reminders_v1_";

function todayString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getStatus(reminder) {
  if (reminder.paid) return "Paid";

  const today = todayString();
  if (reminder.dueDate < today) return "Overdue";
  if (reminder.dueDate === today) return "Due today";

  const due = new Date(`${reminder.dueDate}T00:00:00`);
  const now = new Date(`${today}T00:00:00`);
  const days = Math.round((due - now) / 86400000);

  return days <= 3 ? "Due soon" : "Upcoming";
}

function money(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(Number(value) || 0);
}

export default function Reminders({ userKey = "student" }) {
  const storageKey =
    STORAGE_PREFIX + String(userKey).replace(/[^a-zA-Z0-9_-]/g, "_");

  const [reminders, setReminders] = useState([]);
  const [title, setTitle] = useState("College Fees");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [category, setCategory] = useState("College Fees");
  const [notice, setNotice] = useState("");
  const [permission, setPermission] = useState(
    typeof Notification === "undefined"
      ? "unsupported"
      : Notification.permission
  );

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
      setReminders(Array.isArray(saved) ? saved : []);
    } catch {
      setReminders([]);
    }
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(reminders));
  }, [reminders, storageKey]);

  const activeReminders = useMemo(
    () => reminders.filter((item) => !item.paid),
    [reminders]
  );

  const upcoming = useMemo(
    () =>
      [...activeReminders].sort((a, b) =>
        a.dueDate.localeCompare(b.dueDate)
      ),
    [activeReminders]
  );

  const checkDueReminders = () => {
    if (
      typeof Notification === "undefined" ||
      Notification.permission !== "granted"
    ) {
      return;
    }

    const today = todayString();

    reminders.forEach((reminder) => {
      if (reminder.paid) return;

      const daysLeft = Math.round(
        (new Date(`${reminder.dueDate}T00:00:00`) -
          new Date(`${today}T00:00:00`)) /
          86400000
      );

      if (daysLeft < 0 || daysLeft > 3) return;

      const noticeKey = `mw_reminder_notice_${reminder.id}_${today}`;

      if (localStorage.getItem(noticeKey)) return;

      const message =
        daysLeft === 0
          ? `${reminder.title} is due today. Amount: ${money(reminder.amount)}`
          : `${reminder.title} is due in ${daysLeft} day(s). Amount: ${money(reminder.amount)}`;

      try {
        new Notification("MoneyWise Payment Reminder", {
          body: message,
          tag: noticeKey
        });

        localStorage.setItem(noticeKey, "sent");
      } catch {
        // Some browsers require a service worker for certain notifications.
      }
    });
  };

  useEffect(() => {
    if (permission !== "granted" || reminders.length === 0) return;

    checkDueReminders();

    const timer = window.setInterval(checkDueReminders, 60000);
    return () => window.clearInterval(timer);
  }, [permission, reminders]);

  async function enableNotifications() {
    if (!("Notification" in window)) {
      setNotice("This browser does not support system notifications.");
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === "granted") {
        setNotice("Notifications enabled. We'll check reminders while MoneyWise is open.");
      } else {
        setNotice("Notifications were not enabled. You can still view reminders here.");
      }
    } catch {
      setNotice("Could not enable notifications in this browser.");
    }
  }

  function addReminder(event) {
    event.preventDefault();

    if (!title.trim() || !dueDate || Number(amount) <= 0) {
      setNotice("Enter a title, a valid amount, and a due date.");
      return;
    }

    const newReminder = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title: title.trim(),
      amount: Number(amount),
      dueDate,
      category,
      paid: false,
      createdAt: new Date().toISOString()
    };

    setReminders((current) => [...current, newReminder]);
    setTitle("");
    setAmount("");
    setDueDate("");
    setCategory("College Fees");
    setNotice("Reminder added successfully.");
  }

  function togglePaid(id) {
    setReminders((current) =>
      current.map((item) =>
        item.id === id ? { ...item, paid: !item.paid } : item
      )
    );
  }

  function deleteReminder(id) {
    setReminders((current) => current.filter((item) => item.id !== id));
    setNotice("Reminder deleted.");
  }

  const unpaidTotal = activeReminders.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  return (
    <div className="page-content reminder-page">
      <div className="reminder-heading">
        <div>
          <span className="reminder-eyebrow">STAY ON TRACK</span>
          <h1>Bill & Fee Reminders</h1>
          <p>Keep important payment dates in one place.</p>
        </div>

        <div className="reminder-heading-icon">
          <BellRing size={27} />
        </div>
      </div>

      <div className="reminder-summary">
        <div className="reminder-summary-card">
          <span>Unpaid reminders</span>
          <strong>{activeReminders.length}</strong>
        </div>

        <div className="reminder-summary-card">
          <span>Total amount to track</span>
          <strong>{money(unpaidTotal)}</strong>
        </div>
      </div>

      <section className="reminder-panel">
        <div className="reminder-panel-title">
          <div className="reminder-title-icon">
            <Plus size={19} />
          </div>
          <div>
            <h2>Add a payment reminder</h2>
            <p>For college fees, hostel fees, bills, or payment due dates.</p>
          </div>
        </div>

        <form onSubmit={addReminder} className="reminder-form">
          <label>
            Reminder title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Semester 3 college fees"
              maxLength={100}
              required
            />
          </label>

          <label>
            Category
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option>College Fees</option>
              <option>Hostel Fees</option>
              <option>Education Payment</option>
              <option>Loan Payment</option>
              <option>Rent</option>
              <option>Utility Bill</option>
              <option>Other</option>
            </select>
          </label>

          <label>
            Amount (₹)
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="e.g. 25000"
              required
            />
          </label>

          <label>
            Due date
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              required
            />
          </label>

          <button className="reminder-primary-btn" type="submit">
            <Plus size={17} /> Add reminder
          </button>
        </form>
      </section>

      <section className="reminder-panel">
        <div className="reminder-panel-title">
          <div className="reminder-title-icon">
            <CalendarDays size={19} />
          </div>
          <div>
            <h2>Your payment schedule</h2>
            <p>Review upcoming and overdue payments.</p>
          </div>
        </div>

        {upcoming.length === 0 ? (
          <div className="reminder-empty">
            <CheckCircle2 size={32} />
            <strong>You're all caught up!</strong>
            <p>Add a reminder when you have an upcoming payment.</p>
          </div>
        ) : (
          <div className="reminder-list">
            {upcoming.map((item) => {
              const status = getStatus(item);

              return (
                <article className="reminder-item" key={item.id}>
                  <div className="reminder-item-icon">
                    {item.paid ? (
                      <CheckCircle2 size={21} />
                    ) : (
                      <Wallet size={21} />
                    )}
                  </div>

                  <div className="reminder-item-main">
                    <div className="reminder-item-title-row">
                      <h3>{item.title}</h3>
                      <span
                        className={`reminder-status ${status
                          .toLowerCase()
                          .replaceAll(" ", "-")}`}
                      >
                        {status}
                      </span>
                    </div>

                    <p>{item.category}</p>

                    <div className="reminder-date">
                      <Clock size={14} />
                      Due: {new Date(`${item.dueDate}T00:00:00`).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric"
                      })}
                    </div>

                    <strong className="reminder-amount">
                      {money(item.amount)}
                    </strong>

                    <div className="reminder-actions">
                      <button
                        type="button"
                        className="reminder-paid-btn"
                        onClick={() => togglePaid(item.id)}
                      >
                        <CheckCircle2 size={15} />
                        {item.paid ? "Mark unpaid" : "Mark as paid"}
                      </button>

                      <button
                        type="button"
                        className="reminder-delete-btn"
                        onClick={() => deleteReminder(item.id)}
                        aria-label={`Delete ${item.title}`}
                      >
                        <Trash2 size={15} /> Delete
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="reminder-notification-panel">
        <div>
          <h2><BellRing size={18} /> Browser notifications</h2>
          <p>
            Receive a browser alert for unpaid reminders due within three days
            while MoneyWise is open.
          </p>
          <small>
            Notifications are checked on this device. They are not guaranteed
            when the browser or website is closed.
          </small>
        </div>

        <button
          type="button"
          className="reminder-primary-btn"
          onClick={enableNotifications}
          disabled={permission === "granted"}
        >
          {permission === "granted"
            ? "Notifications enabled"
            : "Enable notifications"}
        </button>
      </section>

      {notice && (
        <div className="reminder-notice" role="status">
          {notice}
          <button type="button" onClick={() => setNotice("")}>
            Dismiss
          </button>
        </div>
      )}

      <p className="reminder-disclaimer">
        MoneyWise tracks dates and amounts you enter. It does not contact your
        college, lender, or bank, and it does not make payments.
      </p>
    </div>
  );
}
