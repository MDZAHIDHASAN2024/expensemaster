# 💵 ExpenseBook - MERN Stack Expense Manager

## Features
- ✅ User Registration & Login (JWT Auth)
- ✅ Add / Edit / Delete Expenses
- ✅ Filter by Date Range, Month, Year, Item Type
- ✅ Dashboard with Charts (Bar + Pie)
- ✅ Export to Excel (.xlsx)
- ✅ Export to PDF
- ✅ Manage Item Types (add/edit/delete)
- ✅ Manage Item Descriptions (add/edit/delete)
- ✅ 200+ pre-loaded item descriptions
- ✅ Responsive UI

## Prerequisites
- Node.js v16+
- MongoDB (local or Atlas)

## Setup Instructions

### 1. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env: set your MONGO_URI and JWT_SECRET
npm run dev
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm start
```

### 3. Open App
Visit: **http://localhost:3000**

## Environment Variables (backend/.env)
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/expense_db
JWT_SECRET=your_secret_key_here
```

## Tech Stack
- **Frontend**: React 18, React Router v6, Recharts, Axios
- **Backend**: Node.js, Express.js
- **Database**: MongoDB + Mongoose
- **Auth**: JWT + bcrypt
- **Export**: xlsx (Excel), pdfkit (PDF)

## First Time Use
1. Register a new account
2. Categories auto-load on registration
3. Or go to Categories → "Load Defaults" to reload

## Project Structure
```
expense-app/
├── backend/
│   ├── models/        (User, Expense, Category)
│   ├── routes/        (auth, expenses, categories, reports)
│   ├── middleware/    (JWT auth)
│   └── server.js
└── frontend/
    └── src/
        ├── pages/     (Dashboard, Expenses, Reports, Categories, Login, Register)
        ├── components/ (Layout)
        ├── context/   (AuthContext)
        └── utils/     (api.js)
```
