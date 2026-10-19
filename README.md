<<<<<<< HEAD
# Warehouse Inventory Management System (WIMS)
**Second-Year B.Tech CSE DBMS Course Project**

A modern, full-stack, enterprise-grade Warehouse Inventory Management System built using **React + Vite** on the frontend, **Node.js + Express** on the backend, and **MySQL 8.0** with `mysql2`.

Designed specifically for college demonstrations and viva examinations with strict relational integrity, parameterized queries, and ACID-compliant transactional consistency.

---

## 1. Relational Database Design & ER Architecture

The system contains **exactly 5 business entities and 4 named relationships**. Foreign keys are implementation details used to enforce relational integrity and cascade/restrict behaviors.

### Exactly Five Entities

1. **`PRODUCT`**
   - `product_id`: INT, Primary Key, Auto-Increment
   - `name`: VARCHAR(100), Required
   - `category`: VARCHAR(100), Required
   - `weight`: DECIMAL(10,2), Optional/Nullable (Non-negative)
   - `expiry_date`: DATE, Nullable (Supports perishable and non-perishable goods)
   - `created_at`: TIMESTAMP

2. **`WAREHOUSE_SECTION`**
   - `section_id`: INT, Primary Key, Auto-Increment
   - `temperature`: DECIMAL(5,2), Nullable (Enables cold chain vs ambient classification)
   - `capacity`: INT, Required (Max total units section can hold, non-negative)
   - `available_space`: INT, Required (Remaining allocatable units, non-negative)
   - `created_at`: TIMESTAMP

3. **`EMPLOYEE`**
   - `employee_id`: INT, Primary Key, Auto-Increment
   - `name`: VARCHAR(100), Required
   - `designation`: VARCHAR(100), Required (e.g. Operations Manager, Supervisor, Dispatch Officer)
   - `phone`: VARCHAR(15), Required
   - `created_at`: TIMESTAMP

4. **`INVENTORY`**
   - `inventory_id`: INT, Primary Key, Auto-Increment
   - `product_id`: INT, Foreign Key referencing `PRODUCT(product_id)` (ON DELETE RESTRICT)
   - `section_id`: INT, Foreign Key referencing `WAREHOUSE_SECTION(section_id)` (ON DELETE RESTRICT)
   - `employee_id`: INT, Foreign Key referencing `EMPLOYEE(employee_id)` (ON DELETE RESTRICT)
   - `quantity`: INT, Required (Strictly positive)
   - `entry_date`: DATE, Required
   - `exit_date`: DATE, Nullable
   - `status`: VARCHAR(30), Required ('Stored', 'Dispatched', 'Reserved', 'Damaged')
   - `created_at`: TIMESTAMP

5. **`DISPATCH`**
   - `dispatch_id`: INT, Primary Key, Auto-Increment
   - `employee_id`: INT, Foreign Key referencing `EMPLOYEE(employee_id)` (ON DELETE RESTRICT)
   - `inventory_id`: INT, Foreign Key referencing `INVENTORY(inventory_id)` (ON DELETE RESTRICT)
   - `vehicle_no`: VARCHAR(30), Required
   - `date`: DATE, Required
   - `destination`: VARCHAR(200), Required
   - `created_at`: TIMESTAMP

---

### Exactly Four Named Relationships

1. **Stored In:** `PRODUCT — WAREHOUSE_SECTION`  
   *Implementation:* Modeled through the foreign keys in the `INVENTORY` entity (`product_id` and `section_id`), linking which product resides in which warehouse section.
2. **Contains:** `WAREHOUSE_SECTION — INVENTORY`  
   *Implementation:* One warehouse section contains multiple allocated inventory batches.
3. **Managed By:** `EMPLOYEE — INVENTORY`  
   *Implementation:* Each inventory batch is logged and supervised by an authorized warehouse employee.
4. **Handles:** `EMPLOYEE — DISPATCH`  
   *Implementation:* An authorized logistics/dispatch officer handles vehicle shipments.

*Note:* In accordance with requirements, customer orders and purchasing modules are intentionally excluded.

---

### The Capacity Invariant

In warehouse logistics, section space is finite. The database and backend enforce this mathematical invariant at all times:

$$\text{available\_space} = \text{capacity} - \sum \text{allocated active stock units}$$

Whenever stock is stored, adjusted, or dispatched:
- **Stock In (Stored):** Deducts quantity from `warehouse_section.available_space`.
- **Stock Exit / Dispatched:** Restores quantity to `warehouse_section.available_space`.
- **Capacity Adjustment:** Rejects any section capacity reduction lower than currently occupied stock.
- **Concurrency Protection:** All multi-row updates execute inside ACID database transactions using row-level locking (`SELECT ... FOR UPDATE`).

---

## 2. Technology Stack

- **Frontend:** React 18, Vite, React Router v6, Recharts, Lucide React, Modern CSS3
- **Backend:** Node.js, Express.js, `mysql2/promise` (connection pooling), CORS, Dotenv, Nodemon
- **Database:** MySQL 8.0 (InnoDB engine, check constraints, foreign key restrictions)
- **Database Tool:** MySQL Workbench / MySQL CLI

---

## 3. Project Directory Structure

```text
warehouse-inventory-management/
├── README.md                  # Complete documentation and viva guide
├── .gitignore                 # Git ignore file for node_modules, .env, build output
├── database.sql               # MySQL database creation script with realistic seed data
│
├── backend/
│   ├── package.json           # Node.js backend dependencies and scripts
│   ├── .env.example           # Example database environment variables
│   ├── .env                   # Local database configuration
│   ├── server.js              # Express app bootstrap, CORS, routes, health check
│   │
│   ├── config/
│   │   └── db.js              # MySQL connection pool using mysql2/promise
│   │
│   ├── middleware/
│   │   ├── errorHandler.js    # Global error handler with MySQL error code mappings
│   │   └── notFound.js        # 404 route middleware
│   │
│   ├── routes/
│   │   ├── dashboardRoutes.js # /api/dashboard routes
│   │   ├── productRoutes.js   # /api/products routes
│   │   ├── sectionRoutes.js   # /api/sections routes
│   │   ├── employeeRoutes.js  # /api/employees routes
│   │   ├── inventoryRoutes.js # /api/inventory routes
│   │   └── dispatchRoutes.js  # /api/dispatches routes
│   │
│   ├── controllers/
│   │   ├── dashboardController.js # Aggregations for KPI cards, charts, alerts
│   │   ├── productController.js   # Product catalog CRUD with search & categories
│   │   ├── sectionController.js   # Section management with capacity checks
│   │   ├── employeeController.js  # Staff directory with managed batch links
│   │   ├── inventoryController.js # Transactional stock intake and space updates
│   │   └── dispatchController.js  # Outbound shipments and stock exit triggers
│   │
│   └── utils/
│       └── validators.js      # Input validation for IDs, quantities, dates, phones
│
└── frontend/
    ├── package.json           # React frontend dependencies
    ├── index.html             # Vite entry HTML with Inter typography
    ├── vite.config.js         # Vite configuration (port 3000)
    ├── .env.example           # Frontend environment example
    ├── .env                   # Frontend API endpoint configuration
    │
    └── src/
        ├── main.jsx           # React DOM root mounting
        ├── App.jsx            # React Router route tree
        │
        ├── api/
        │   └── api.js         # Axios client and API methods
        │
        ├── components/
        │   ├── Layout.jsx     # App shell with Sidebar and Header
        │   ├── Sidebar.jsx    # Module navigation with icons and status
        │   ├── Header.jsx     # Live MySQL connection indicator
        │   ├── StatCard.jsx   # KPI metric card
        │   ├── DataTable.jsx  # Reusable table with loading/empty states
        │   ├── Modal.jsx      # Reusable form modal with Escape handler
        │   ├── ConfirmDialog.jsx # Destructive action confirmation dialog
        │   ├── Loading.jsx    # Animated spinner
        │   ├── ErrorMessage.jsx # Error banner alert
        │   └── EmptyState.jsx # Empty record placeholder
        │
        ├── pages/
        │   ├── Dashboard.jsx  # Live Recharts charts, stats, and expiry alerts
        │   ├── Products.jsx   # Searchable catalog with batch viewer
        │   ├── WarehouseSections.jsx # Section cards, capacity meters, batches
        │   ├── Employees.jsx  # Staff list with Managed By & Handles metrics
        │   ├── Inventory.jsx  # Stock batch management with capacity validation
        │   ├── Dispatches.jsx # Vehicle shipments and exit status triggers
        │   └── NotFound.jsx   # 404 handler
        │
        ├── styles/
        │   ├── global.css     # Design tokens, variables, badges, buttons
        │   ├── layout.css     # Sidebar, Header, container layout
        │   ├── components.css # Cards, tables, modals, spinners
        │   └── pages.css      # Grid layouts, progress bars, chart cards
        │
        └── utils/
            └── formatters.js  # Date, currency, weight, and status badge helpers
```

---

## 4. Setup and Installation Instructions

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **MySQL Server**: 8.0 or higher
- **MySQL Workbench** or MySQL Command Line Client

### Step 1: Import the Database

1. Open your terminal or MySQL Workbench.
2. Execute the `database.sql` script located in the project root:

```bash
# Using MySQL Command Line Client:
mysql -u root -p < database.sql
```

Or open MySQL Workbench, connect to your local MySQL instance, click **File -> Open SQL Script**, select `database.sql`, and execute it (**Query -> Execute**).

This creates the database `warehouse_management`, the 5 tables with all constraints and indexes, and realistic sample data.

---

### Step 2: Configure and Start the Backend

1. Navigate to the `backend` folder:
```bash
cd backend
```

2. Check `.env` configuration (created automatically, or copy from `.env.example`):
```env
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=warehouse_management
```

3. Install dependencies:
```bash
npm install
```

4. Start the backend server:
```bash
# Production / Standard run:
npm start

# Development run with auto-reload:
npm run dev
```

The backend server runs at **`http://localhost:5000`**.  
Verify health by visiting: **`http://localhost:5000/api/health`**.

---

### Step 3: Configure and Start the Frontend

1. Open a new terminal and navigate to the `frontend` folder:
```bash
cd frontend
```

2. Verify `frontend/.env`:
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

3. Install dependencies:
```bash
npm install
```

4. Start the frontend development server:
```bash
npm run dev
```

5. Open your browser and visit: **`http://localhost:3000`**

---

## 5. Backend REST API Reference

All responses return standard JSON with `success: true|false` and informative messages.

### Health Check
- `GET /api/health`: Returns server status and tests the MySQL database connection pool.

### Dashboard
- `GET /api/dashboard/stats`: KPI totals (products, sections, employees, active units, utilization %).
- `GET /api/dashboard/inventory-status`: Batch counts and stock quantities grouped by status.
- `GET /api/dashboard/category-distribution`: Total active stock units per product category.
- `GET /api/dashboard/section-capacity`: Capacity utilization metrics per section for BarChart.
- `GET /api/dashboard/recent-dispatches`: Last 6 outbound vehicle shipments.
- `GET /api/dashboard/expiry-alerts`: Perishable stock batches expiring in $\le 60$ days.

### Products
- `GET /api/products?search=&category=`: List products with active stock totals.
- `GET /api/products/:id`: Get product details and all associated inventory batches.
- `POST /api/products`: Create a product (`name`, `category`, `weight`, `expiry_date`).
- `PUT /api/products/:id`: Update an existing product.
- `DELETE /api/products/:id`: Delete product (blocks if referenced in inventory).

### Warehouse Sections
- `GET /api/sections`: List sections with capacity, allocated stock, and available space.
- `GET /api/sections/:id`: Get section with associated inventory batches.
- `POST /api/sections`: Create section (`capacity`, `temperature`, `available_space`).
- `PUT /api/sections/:id`: Update section (blocks capacity below allocated stock).
- `DELETE /api/sections/:id`: Delete section (blocks if containing inventory).

### Employees
- `GET /api/employees`: List employees with managed batch & handled dispatch counts.
- `GET /api/employees/:id`: Get employee details with managed batches and shipments.
- `POST /api/employees`: Register employee (`name`, `designation`, `phone`).
- `PUT /api/employees/:id`: Update employee details.
- `DELETE /api/employees/:id`: Delete employee (blocks if referenced).

### Inventory
- `GET /api/inventory?page=1&limit=10&product_id=&section_id=&status=&search=`: Paginated inventory.
- `GET /api/inventory/:id`: Single inventory batch with dispatch history.
- `POST /api/inventory`: Allocate new stock (transactionally checks and reserves section capacity).
- `PUT /api/inventory/:id`: Adjust stock quantity, section, or status (maintains capacity invariant).
- `DELETE /api/inventory/:id`: Delete batch and release capacity back to section.

### Dispatches
- `GET /api/dispatches?date=&employee_id=&destination=&search=`: Outbound shipments list.
- `GET /api/dispatches/:id`: Single dispatch record details.
- `POST /api/dispatches`: Record dispatch (updates inventory status to 'Dispatched' and frees section space).
- `PUT /api/dispatches/:id`: Update dispatch details.
- `DELETE /api/dispatches/:id`: Delete dispatch log.

---

## 6. College Viva / Demonstration Q&A Highlights

1. **How is the "Stored In" relationship enforced?**  
   *Answer:* It is modeled via `INVENTORY` which carries foreign keys to both `product(product_id)` and `warehouse_section(section_id)`. One warehouse section contains multiple products across multiple inventory batches.

2. **How does the system prevent overselling or over-allocating section capacity?**  
   *Answer:* When creating or updating an inventory batch, the backend executes an ACID transaction. It locks the warehouse section row using `SELECT ... FOR UPDATE`, checks that `available_space >= quantity`, deducts the quantity from `available_space`, and commits the transaction. If space is insufficient, the transaction rolls back with HTTP 400.

3. **What happens when an inventory batch is dispatched?**  
   *Answer:* When a dispatch record is created, the inventory status is updated to `Dispatched`, the `exit_date` is stamped, and the allocated units are credited back to the warehouse section's `available_space`.

4. **Why are parameterized queries used?**  
   *Answer:* Every query uses `?` placeholders (e.g. `SELECT * FROM product WHERE product_id = ?`) with `mysql2/promise` to eliminate SQL injection vulnerabilities.

---

## 7. Troubleshooting

- **Error: Access denied for user 'root'@'localhost'**:  
  Ensure `DB_PASSWORD` in `backend/.env` matches your local MySQL root password.
- **Error: Port 5000 in use**:  
  Change `PORT=5001` in `backend/.env` and update `VITE_API_BASE_URL=http://localhost:5001/api` in `frontend/.env`.
- **Foreign Key Deletion Error (409 Conflict)**:  
  Foreign key constraints prevent deletion of referenced entities. Delete or reassign dependent records first.
=======
# warehouse-inventory-management
>>>>>>> efbbfafbe93158f264186d76f093d738c0f40e2c
