# 💰 MoneyMate — Student Finance & Money Management

**Small steps. Smarter money.**

MoneyMate is a student-focused personal finance web application designed to help students understand their spending, manage budgets, set savings goals, and develop healthy financial habits.

🔗 **Live Demo:** https://moneymate-inky.vercel.app/  
🔗 **Backend API:** https://moneymate-api-nc9i.onrender.com/  
🔗 **GitHub Repository:** https://github.com/vyshnaviporandla/MoneyMate

---

## 📌 Problem Statement

Many students find it difficult to manage limited money, track expenses, plan monthly budgets, and develop consistent savings habits. A lack of practical financial education can make it challenging to make informed spending decisions.

**Problem Statement:** Teach personal finance, budgeting, and healthy money habits to students.

## 💡 Our Solution

MoneyMate provides a simple and student-friendly digital platform where users can organize their financial activities and practice better money management.

The application combines expense tracking, budget planning, savings goals, and financial education in one place. It aims to make financial learning practical, accessible, and engaging.

## ✨ Key Features

- **User Authentication:** Account registration and login.
- **Finance Dashboard:** An overview of financial activity and progress.
- **Transaction Management:** Record and organize income and expenses.
- **Budget Planning:** Set budgets and compare planned amounts with spending.
- **Savings Goals:** Define financial targets and monitor progress.
- **Financial Education:** Support learning about budgeting and money habits.
- **Student-Friendly Interface:** A clean, accessible experience designed for students.

*Note: The availability of individual features depends on the current implementation and backend integration.*

## 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| React | Frontend user interface |
| Vite | Frontend development and build tooling |
| CSS | Styling and responsive layouts |
| Node.js | JavaScript runtime for the backend |
| Express.js | Backend API framework |
| Firebase Authentication | User authentication, where configured |
| SQLite | Database for application data |
| Git and GitHub | Version control and collaboration |
| Vercel | Frontend deployment |
| Render | Backend deployment |

## 🏗️ System Architecture

```text
Student
   |
   v
React + Vite Frontend
   |
   v
API Requests
   |
   v
Node.js + Express Backend
   |
   v
SQLite Database
```

Firebase Authentication supports the authentication flow where configured. The frontend communicates with the backend using the configured API URL.

## 📂 Project Structure

```text
MoneyMate/
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js
│   │   └── firebase.js
│   ├── package.json
│   └── vite.config.js
├── backend/
│   ├── server.js
│   ├── package.json
│   └── moneywise.db
├── .gitignore
└── README.md
```

*The structure above is illustrative. Update it if your actual repository differs. Do not commit database files or private credentials.*

## ⚙️ Installation and Setup

### Prerequisites

Install the following before running the project locally:

- Node.js and npm
- Git
- Visual Studio Code (recommended)

### 1. Clone the Repository

```bash
git clone https://github.com/vyshnaviporandla/MoneyMate.git
cd MoneyMate
```

### 2. Set Up the Backend

```bash
cd backend
npm install
```

Configure the required backend environment variables in a local `.env` file or your hosting provider's environment settings, according to your implementation.

Start the backend:

```bash
npm start
```

The local API is expected to run at:

```text
http://localhost:5000
```

If supported by the deployed version, check the health endpoint:

```text
http://localhost:5000/api/health
```

### 3. Set Up the Frontend

Open a second terminal:

```bash
cd frontend
npm install
```

Create a frontend `.env` file with the API URL and Firebase web configuration required by your application.

Example:

```env
VITE_API_URL=http://localhost:5000
VITE_FIREBASE_API_KEY=your_firebase_web_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
```

Replace the example values with the appropriate configuration from your Firebase project. Never put private service-account credentials or backend secrets in frontend environment variables.

Start the frontend:

```bash
npm run dev
```

Open the local URL displayed in your terminal.

### 4. Build for Production

From the frontend directory:

```bash
npm run build
```

Vite generates the production build in the `dist` directory.

## 🌐 Deployment

**Frontend:** [MoneyMate on Vercel](https://moneymate-inky.vercel.app/)

**Backend:** [MoneyMate API on Render](https://moneymate-api-nc9i.onrender.com/)

The frontend requires the correct `VITE_API_URL` environment variable. Firebase Authentication also requires the appropriate configuration and authorized domains.

For Google sign-in, add the deployed frontend domain to Firebase Console → Authentication → Settings → Authorized domains.

## 👥 Team Contributions

Our team divided the project into four primary responsibilities.

| Member | Role | Contribution |
|---|---|---|
| Member 1 | Frontend Developer | React interface, dashboard, forms, navigation, and responsive design |
| Member 2 | Backend Developer | API development, server-side validation, calculations, and integration |
| Member 3 | Database and Security Developer | Data model, persistence, authentication configuration, and security checks |
| Member 4 | Frontend Developer | Backend Developer | Testing and Documentation Lead | Feature testing, financial education content, project documentation, and demo preparation |

Replace “Member 1” through “Member 4” with your teammates' names and update the contributions to reflect the work each person actually completed.

## 🔐 Security and Privacy

- Never commit `.env` files, Firebase service-account keys, access tokens, or private credentials.
- Keep backend secrets in server-side environment variables.
- Restrict access to user-specific data through authentication and authorization.
- Use fictional information when demonstrating financial features.
- Do not enter banking passwords, UPI PINs, or other sensitive banking credentials into the application.
- Verify that the hosting platform provides the persistence required for stored records.

**Important limitation:** Recording a transaction with a payment method such as UPI does not mean MoneyMate is directly connected to a bank or retrieves real UPI transactions.

## 🚀 Future Enhancements

- Interactive financial literacy quizzes with explanations.
- Spending insights and category-wise reports.
- Budget reminders and savings milestones.
- Improved charts and monthly financial summaries.
- More comprehensive automated testing.
- Persistent production database and backup support.
- Accessibility and mobile usability improvements.
- Optional AI-powered financial learning assistance.

These are proposed enhancements and should not be considered implemented until they are built and tested.

## 🎯 Expected Impact

MoneyMate aims to help students:

- Understand where their money goes.
- Develop practical budgeting skills.
- Set and monitor savings goals.
- Make more thoughtful spending decisions.
- Build confidence in everyday financial planning.

## 📄 Disclaimer

MoneyMate is an educational student project. It is not a banking application, a payment processor, or a substitute for professional financial advice. Users should not enter confidential banking credentials.

## 🙌 Acknowledgements

Developed as a student project to promote financial awareness, practical budgeting, and responsible money habits.

**MoneyMate — Your Money. Your Future.**
