import "dotenv/config";
import bcrypt from "bcryptjs";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured.");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

const permissions = [
  // Dashboard
  ["dashboard.view", "View Dashboard", "dashboard"],

  // Users
  ["users.view", "View Users", "users"],
  ["users.create", "Create Users", "users"],
  ["users.edit", "Edit Users", "users"],
  ["users.delete", "Delete Users", "users"],
  ["users.change_password", "Change User Password", "users"],
  ["users.activate", "Activate/Deactivate Users", "users"],

  // Roles / Permissions
  ["roles.view", "View Roles", "roles"],
  ["roles.create", "Create Roles", "roles"],
  ["roles.edit", "Edit Roles", "roles"],
  ["roles.delete", "Delete Roles", "roles"],
  ["permissions.view", "View Permissions", "permissions"],
  ["permissions.assign", "Assign Permissions", "permissions"],

  // Departments
  ["departments.view", "View Departments", "departments"],
  ["departments.create", "Create Departments", "departments"],
  ["departments.edit", "Edit Departments", "departments"],
  ["departments.delete", "Delete Departments", "departments"],

  // Parties
  ["parties.view", "View Parties", "parties"],
  ["parties.create", "Create Parties", "parties"],
  ["parties.edit", "Edit Parties", "parties"],
  ["parties.delete", "Delete Parties", "parties"],

  // Persons
  ["persons.view", "View Persons", "persons"],
  ["persons.create", "Create Persons", "persons"],
  ["persons.edit", "Edit Persons", "persons"],
  ["persons.delete", "Delete Persons", "persons"],

  // Food Master
  ["food.view", "View Food Items", "food"],
  ["food.create", "Create Food Items", "food"],
  ["food.edit", "Edit Food Items", "food"],
  ["food.delete", "Delete Food Items", "food"],

  // Rates
  ["rates.view", "View Rates", "rates"],
  ["rates.create", "Create Rates", "rates"],
  ["rates.edit", "Edit Rates", "rates"],

  // Sales
  ["sales.view", "View Sales", "sales"],
  ["sales.create", "Create Sales", "sales"],
  ["sales.edit", "Edit Sales", "sales"],
  ["sales.cancel", "Cancel Sales", "sales"],
  ["sales.refund", "Refund Sales", "sales"],

  // Bulk Consumption
  ["bulk_consumption.view", "View Bulk Consumption", "bulk_consumption"],
  ["bulk_consumption.create", "Create Bulk Consumption", "bulk_consumption"],
  ["bulk_consumption.edit", "Edit Bulk Consumption", "bulk_consumption"],
  ["bulk_consumption.cancel", "Cancel Bulk Consumption", "bulk_consumption"],

  // Payments
  ["payments.view", "View Payments", "payments"],
  ["payments.create", "Create Payments", "payments"],
  ["payments.cancel", "Cancel Payments", "payments"],

  // Ledger
  ["ledger.view", "View Ledger", "ledger"],
  ["ledger.adjust", "Adjust Ledger", "ledger"],

  // Suppliers
  ["suppliers.view", "View Suppliers", "suppliers"],
  ["suppliers.create", "Create Suppliers", "suppliers"],
  ["suppliers.edit", "Edit Suppliers", "suppliers"],
  ["suppliers.delete", "Delete Suppliers", "suppliers"],

  // Purchase
  ["purchases.view", "View Purchases", "purchases"],
  ["purchases.create", "Create Purchases", "purchases"],
  ["purchases.edit", "Edit Purchases", "purchases"],
  ["purchases.cancel", "Cancel Purchases", "purchases"],
  ["purchases.receive", "Receive Purchases", "purchases"],

  // Inventory
  ["inventory.view", "View Inventory", "inventory"],
  ["inventory.adjust", "Adjust Inventory", "inventory"],
  ["inventory.wastage", "Record Wastage", "inventory"],

  ["wastage.view", "View Wastage", "wastage"],
  ["wastage.create", "Create Wastage", "wastage"],

  // Expenses
  ["expenses.view", "View Expenses", "expenses"],
  ["expenses.create", "Create Expenses", "expenses"],
  ["expenses.edit", "Edit Expenses", "expenses"],
  ["expenses.delete", "Delete Expenses", "expenses"],

  // Reports
  ["reports.view", "View Reports", "reports"],
  ["reports.export", "Export Reports", "reports"],

  // Settings
  ["settings.view", "View Settings", "settings"],
  ["settings.edit", "Edit Settings", "settings"],

  // Audit
  ["audit.view", "View Audit Logs", "audit"],
  
];

const roles = [
  {
    name: "SUPER_ADMIN",
    description: "Complete system access",
  },
  {
    name: "ADMIN",
    description: "System administration",
  },
  {
    name: "CANTEEN_MANAGER",
    description: "Canteen operations management",
  },
  {
    name: "BILLING_OPERATOR",
    description: "Billing and payment operations",
  },
  {
    name: "STORE_OPERATOR",
    description: "Purchase and inventory operations",
  },
  {
    name: "REPORT_USER",
    description: "Reports and read-only access",
  },
];

async function main() {
  console.log("Starting database seed...");

  // ---------------------------------------------
  // Permissions
  // ---------------------------------------------

  const permissionMap = new Map<string, number>();

  for (const [code, name, module] of permissions) {
    const permission = await prisma.permission.upsert({
      where: {
        code,
      },
      update: {
        name,
        module,
        isActive: true,
      },
      create: {
        code,
        name,
        module,
        isActive: true,
      },
    });

    permissionMap.set(permission.code, permission.id);
  }

  // ---------------------------------------------
  // Roles
  // ---------------------------------------------

  const roleMap = new Map<string, number>();

  for (const roleData of roles) {
    const role = await prisma.role.upsert({
      where: {
        name: roleData.name,
      },
      update: {
        description: roleData.description,
        isActive: true,
      },
      create: {
        name: roleData.name,
        description: roleData.description,
        isActive: true,
      },
    });

    roleMap.set(role.name, role.id);
  }

  // ---------------------------------------------
  // SUPER_ADMIN gets all permissions
  // ---------------------------------------------

  const superAdminRoleId = roleMap.get("SUPER_ADMIN");

  if (!superAdminRoleId) {
    throw new Error("SUPER_ADMIN role not found.");
  }

  for (const permissionId of permissionMap.values()) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: superAdminRoleId,
          permissionId,
        },
      },
      update: {},
      create: {
        roleId: superAdminRoleId,
        permissionId,
      },
    });
  }

  // ---------------------------------------------
  // Create initial admin
  // ---------------------------------------------

  const passwordHash = await bcrypt.hash(
    "ChangeMe@123",
    12
  );

  const admin = await prisma.user.upsert({
    where: {
      username: "admin",
    },
    update: {
      fullName: "System Administrator",
      roleId: superAdminRoleId,
      status: "ACTIVE",
    },
    create: {
      username: "admin",
      passwordHash,
      fullName: "System Administrator",
      roleId: superAdminRoleId,
      status: "ACTIVE",
    },
  });

  console.log("");
  console.log("=================================");
  console.log("DATABASE SEED COMPLETED");
  console.log("=================================");
  console.log(`Permissions: ${permissionMap.size}`);
  console.log(`Roles: ${roleMap.size}`);
  console.log(`Administrator: ${admin.username}`);
  console.log("");
  console.log("Development login:");
  console.log("Username: admin");
  console.log("Password: ChangeMe@123");
  console.log("");
  console.log("CHANGE THE PASSWORD AFTER FIRST LOGIN.");
  console.log("=================================");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });