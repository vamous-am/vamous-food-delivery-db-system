# 🍔 Campus Eats (Full-Stack Food Delivery)

**Live Demo:** [vamous-food-delivery-db-system.vercel.app](https://vamous-food-delivery-db-system.vercel.app/)

Hey! This is a full-stack food delivery platform I originally started as a college project, but I wanted to push it further and build something that actually works like a real-world production app under the hood. 

Instead of just building a basic CRUD app, I focused heavily on database integrity, security, and edge cases (like preventing race conditions and handling complex order state machines).

---

## 🛠️ The Tech Stack
* **Frontend:** React.js, React Router, Axios, plain CSS (focused on functionality and flow over heavy styling).
* **Backend:** Node.js, Express.js.
* **Database:** MySQL, Sequelize ORM.
* **Deployment:** Vercel (Frontend), Render (Backend), Aiven (Cloud MySQL).

---

## 🧠 Features 

I spent a lot of time making sure the backend doesn't just "work" on the happy path, but actively prevents bad data:

* **Atomic Transactions:** When a user checks out, the backend creates the order, logs the individual items, clears the user's cart, and records the status history *all at once*. If any single step fails, the entire transaction rolls back so the database never gets corrupted.
* **Race Condition Prevention:** I used database-level constraints and Row-Level Locking (`t.LOCK.UPDATE`). This means if two delivery drivers click "Accept Order" at the exact same millisecond, the database safely locks the row and gives it to the first driver, completely blocking the second one.
* **Strict Role-Based Access (RBAC):** The app has three distinct roles: `customer`, `restaurant_owner`/`admin`, and `driver`. The backend actively rejects unauthorized requests (e.g., a customer cannot trigger the route to mark their own food as "cooking", and they cannot fetch other users' order histories).
* **True Database Math:** The admin dashboard doesn't pull hundreds of orders into React to calculate revenue. It uses native SQL aggregations (`COUNT` and `AVG`) to calculate active orders and daily revenue instantly on the backend.
* **Auto-Polling UI:** The order confirmation page automatically pings the server every 10 seconds to check for status updates, automatically stopping if it hits a permanent error (like a 404) to prevent server spam.

---

## 🔑 Try It Out!

You can visit the live link above and register a new customer account to test the ordering flow. 

If you want to see the **Admin Dashboard** or test the **State Machine** (moving an order from *Preparing* → *Ready*), you can log in with this demo admin account:

> **Email:** `vamous23@gmail.com`  
> **Password:** `passhaha23`

---

## 💻 Running it Locally

If you want to clone this and run it on your own machine:

### 1. Clone the repo & install dependencies
```bash
git clone https://github.com/vamous-am/vamous-food-delivery-db-system.git
cd vamous-food-delivery-db-system

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

2. Setup your Database
Make sure you have MySQL running locally. Create an empty database called food_delivery_db.
Create a .env file in the backend folder and add your credentials:
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_local_password_here
DB_NAME=food_delivery_db
JWT_SECRET=put_a_random_secret_string_here
JWT_EXPIRES_IN=30d

3. Seed the Database & Start the Servers
# In the backend terminal:
npm run seed  # This creates the tables and inserts dummy data!
npm run dev   # Starts the Express server on port 5000

# In a new terminal, navigate to the frontend folder:
npm start     # Starts the React app on port 3000
