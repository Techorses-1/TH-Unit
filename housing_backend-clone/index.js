const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// MongoDB Connection
const connectDB = require('./config/mongodb');
connectDB();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));


// Middlewares
app.use(cors());
app.use(express.json());


const cron = require("node-cron");

const Customer = require("./models/customer");
app.use("/uploads/expenses", express.static("uploads/expenses"));



const authRoutes = require("./routes/authRoutes");
const memberRoutes = require("./routes/member");
const MaintenanceRoutes = require("./routes/maintenanceRate");
const MaintenanceFormRoutes = require("./routes/maintenance");
const waterRoutes = require("./routes/waterRate");
const expenseRoutes = require("./routes/expense");
const dashboardRoutes = require("./routes/dashboard");





// app.use('/customer', customerRoutes);
app.use('/auth', authRoutes);
app.use('/member', memberRoutes);
app.use('/maintenance-rate', MaintenanceRoutes);
app.use('/maintenance', MaintenanceFormRoutes);
app.use('/water-rate', waterRoutes);
app.use("/expense", expenseRoutes);
app.use("/dashboard", dashboardRoutes);





cron.schedule("0 0 1 1 *", async () => {
  try {
    await Customer.updateMany({}, { $set: { loyaltyCoins: 0 } });
    console.log("✅ Yearly reset: Loyalty coins reset for all customers (1 Jan)");
  } catch (error) {
    console.error("❌ Error resetting loyalty coins:", error);
  }
});






// Basic Route
app.get('/', (req, res) => {
  res.send('New Techorses from thunit  Backend !');
});

// Server
const PORT = process.env.PORT || 3041;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});