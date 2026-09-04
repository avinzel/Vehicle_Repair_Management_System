# Vehicle Repair & Maintenance Management System

A role-based web application for managing vehicle repair orders, mechanic assignments, inventory, and billing. Built with a **PHP** RESTful backend and a **React (Vite)** frontend.

---

## 🚀 Getting Started (Local Setup)

Follow these steps to run the application on your local machine after cloning or pulling the repository.

### Prerequisites
Make sure you have the following installed on your system:
* **PHP** (v8.0 or higher)
* **Composer**
* **Node.js** (v18 or higher) & **npm**
* **MySQL** / **MariaDB** (via XAMPP, WampServer, or native MySQL)

---

## 🛠️ 1. Backend Setup

### Step A: Install Dependencies
Navigate into the `backend` directory and install the Composer dependencies (this automatically generates the autoloader):

```bash
cd backend
composer install
```

### Step B: Database Setup

1. Open your database management tool (e.g., phpMyAdmin, MySQL Workbench, or DBeaver).
2. Create a new database named `VehicleRepair`.
3. Import and execute the DDL script (`schema.sql`) to generate all tables.

### Step C: Run the PHP Local Development Server
To ensure all frontend API calls route correctly, navigate to the routes folder and start the PHP built-in server on port `8000`:

```bash
cd public/routes
php -S localhost:8000
```

> **Note:** The backend must run on `http://localhost:8000` because the frontend CORS and API fetch endpoints are configured for this specific address.

---

## 💻 2. Frontend Setup

Open a new terminal window and follow these steps to start the React client:

### Step A: Install Node Dependencies
Navigate to the root/frontend directory where `package.json` is located and install dependencies:

```bash
npm install
```

### Step B: Run Development Server
Start the Vite development server:

```bash
npm run dev
```

The app will usually open at `http://localhost:5173`. Open this URL in your browser to view the application.

---

## 📌 Development Notes & Troubleshooting

* **CORS / Session Issues:** Ensure `credentials: "include"` is maintained in all frontend `fetch()` requests and backend session headers allow `http://localhost:5173`.

