import "dotenv/config";
import authRoutes from "./routes/auth.routes.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import userRoutes from "./routes/user.routes.js";
import { prisma } from "./lib/prisma.js";

import departmentRoutes from "./routes/department.routes.js";
import partyRoutes from "./routes/party.routes.js";
import personRoutes from "./routes/person.routes.js";
import foodCategoryRoutes from "./routes/food-category.routes.js";
import unitRoutes from "./routes/unit.routes.js";
import foodItemRoutes from "./routes/food-item.routes.js";
import rateMasterRoutes from "./routes/rate-master.routes.js";
import saleRoutes from "./routes/sale.routes.js";
import supplierRoutes from "./routes/supplier.routes.js";
import purchaseRoutes from "./routes/purchase.routes.js";
import inventoryRoutes from "./routes/inventory.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import ledgerRoutes from "./routes/ledger.routes.js";
import reportRoutes from "./routes/report.routes.js";


const app = express();

const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
/* app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
); */

app.use(helmet());

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/parties", partyRoutes);
app.use("/api/persons", personRoutes);
app.use(
  "/api/food-categories",
  foodCategoryRoutes
);
app.use("/api/units", unitRoutes);
app.use("/api/food-items", foodItemRoutes);
app.use("/api/rates", rateMasterRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/ledger", ledgerRoutes);
app.use("/api/reports", reportRoutes);
// --------------------------------------------------
// Health Check
// --------------------------------------------------

app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      success: true,
      message: "Canteen API is running",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Database health check failed:", error);

    res.status(503).json({
      success: false,
      message: "API is running but database connection failed",
      database: "disconnected",
    });
  }
});

// --------------------------------------------------
// Root
// --------------------------------------------------

app.get("/", (_req, res) => {
  res.json({
    success: true,
    application: "Canteen Management System",
    version: "1.0.0",
    api: "/api",
  });
});

// --------------------------------------------------
// Start Server
// --------------------------------------------------

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`
=========================================
 CANTEEN MANAGEMENT API
=========================================
 Server : http://localhost:${PORT}
 Health : http://localhost:${PORT}/api/health
=========================================
`);
});

// --------------------------------------------------
// Graceful Shutdown
// --------------------------------------------------

async function shutdown() {
  console.log("Shutting down server...");

  await prisma.$disconnect();

  server.close(() => {
    console.log("Server stopped.");
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);