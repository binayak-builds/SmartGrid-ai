# SmartGrid+ (AI-Powered Electricity Bill Management System)

SmartGrid+ is an AI-powered electricity bill management system that tracks usage, predicts consumption, manages billing, and applies penalty logic for overdue payments with an interactive dashboard.

## Features
- **Smart Authentication**: JWT based login via meter number.
- **Admin Dashboard**: Generate bills seamlessly based on simulated unit input.
- **User Dashboard**: Track 6-month usage trends and status tracking (paid/unpaid).
- **AI-Prediction Module**: Predicts next-month usage and provides cost-reduction tips via Scikit-Learn logic.
- **Microservices**: Frontend (Next.js), Backend (Express + Prisma), AI (FastAPI).

---

## 🚀 How to Run Locally

### 1) Backend System (Express + Prisma + SQLite)
We are using SQLite by default for zero-config fast setup. 

```bash
cd backend
npm install
npx prisma db push
npx prisma generate

# Create dummy Tax structure (Optional):
# Hit POST http://localhost:5050/api/dev/seed 

npm run start
# OR using ts-node: npx ts-node src/index.ts
```
*(Optionally: if you strictly want PostgreSQL/MySQL, just update `provider=postgresql` inside `backend/prisma/schema.prisma` natively! An alternative `database_schema.sql` is provided at the root folder for generic deployment.)*

### 2) Frontend System (Next.js 14)
Beautiful tailwind UI using sleek glassmorphism themes.

```bash
cd frontend
npm install
npm run dev
```

Visit: **http://localhost:3000**

### 3) AI-Prediction Module (Python FastAPI) *(Optional)*
The Express backend is robustly designed. If the Python AI server is NOT running, it falls back to mocked AI predictions. If you want the real ML models:

```bash
cd ai-service
python -m venv venv
venv\Scripts\activate # Windows
pip install -r requirements.txt
python model.py # Trains and saves PKL models using RandomForest and IsolationForest
python main.py
```

## Setup Admin User
1. Open http://localhost:3000/register
2. Create an account.
3. You can utilize a SQL editor (like DBeaver or Prisma Studio) to set your role to `ADMIN` inside the `dev.db` customer table.
```sql
UPDATE Customer SET role = 'ADMIN' where email = 'your.email@gmail.com';
```
