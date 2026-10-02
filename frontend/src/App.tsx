import { useEffect, useState } from "react";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import { api, clearToken, getToken, setToken } from "./api";
import { getLocalized, Language, t } from "./i18n";
import type { DashboardData, Filters, ReportKey } from "./types";
import { ModulePage } from "./modules";

type LoginResponse = {
  success?: boolean;
  token?: string;
  accessToken?: string;
  data?: any;
};

const reportLabels: Record<ReportKey, { en: string; hi: string }> = {
  sales: { en: "Sales Report", hi: "बिक्री रिपोर्ट" },
  salesFood: { en: "Sales by Food Item", hi: "खाद्य सामग्री अनुसार बिक्री" },
  salesDepartment: { en: "Sales by Department", hi: "विभाग अनुसार बिक्री" },
  purchases: { en: "Purchase Report", hi: "खरीद रिपोर्ट" },
  collections: { en: "Collection Report", hi: "वसूली रिपोर्ट" },
  outstanding: { en: "Outstanding / Party Ledger", hi: "बकाया / पार्टी लेजर" },
  expenses: { en: "Expense Report", hi: "व्यय रिपोर्ट" },
  stock: { en: "Stock Report", hi: "स्टॉक रिपोर्ट" },
  stockMovements: { en: "Stock Movement", hi: "स्टॉक मूवमेंट" },
  wastage: { en: "Wastage Report", hi: "बर्बादी रिपोर्ट" }
};

const money = (value: unknown) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

const dateTime = (value: unknown) => {
  if (!value) return "";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-IN");
};

function makeParams(filters: Filters, includeStatus = true) {
  const p = new URLSearchParams();

  if (filters.fromDate) p.set("fromDate", filters.fromDate);
  if (filters.toDate) p.set("toDate", filters.toDate);

  if (includeStatus && filters.status) {
    p.set("status", filters.status);
  }

  const text = p.toString();
  return text ? `?${text}` : "";
}

function downloadCsv(report: ReportKey, filters: Filters) {
  const endpointMap: Record<ReportKey, string> = {
    sales: "/reports/sales",
    salesFood: "/reports/sales-by-food-item",
    salesDepartment: "/reports/sales-by-department",
    purchases: "/reports/purchases",
    collections: "/reports/collections",
    outstanding: "/reports/outstanding",
    expenses: "/reports/expenses",
    stock: "/reports/stock",
    stockMovements: "/reports/stock-movements",
    wastage: "/reports/wastage"
  };

  const params = new URLSearchParams();

  if (filters.fromDate) params.set("fromDate", filters.fromDate);
  if (filters.toDate) params.set("toDate", filters.toDate);

  if (report === "sales" && filters.status) {
    params.set("status", filters.status);
  }

  params.set("format", "csv");

  const token = getToken();

  fetch(
    `${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"}${endpointMap[report]}?${params}`,
    {
      headers: token
        ? { Authorization: `Bearer ${token}` }
        : {}
    }
  )
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return response.blob();
    })
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${report}-report.csv`;
      a.click();
      URL.revokeObjectURL(url);
    })
    .catch((error) => {
      alert(error.message || "CSV export failed.");
    });
}

function Login({
  lang,
  onLoggedIn
}: {
  lang: Language;
  onLoggedIn: () => void;
}) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("ChangeMe@123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result: LoginResponse = await api.login(
        username,
        password
      );

      const token =
        result.token ||
        result.accessToken ||
        result.data?.token ||
        result.data?.accessToken;

      if (!token) {
        throw new Error(
          "Login succeeded but JWT token was not found in the response."
        );
      }

      setToken(token);
      onLoggedIn();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(lang, "loginFailed")
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="brand-mark">VK</div>
        <h1>{t(lang, "appTitle")}</h1>
        <p className="muted">{t(lang, "login")}</p>

        {error && <div className="alert error">{error}</div>}

        <label>{t(lang, "username")}</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          required
        />

        <label>{t(lang, "password")}</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        <button className="primary-btn full" disabled={loading}>
          {loading ? t(lang, "loading") : t(lang, "login")}
        </button>

        <div className="login-api">
          API:{" "}
          {import.meta.env.VITE_API_BASE_URL ||
            "http://localhost:5000/api"}
        </div>
      </form>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon
}: {
  title: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div>
        <div className="stat-title">{title}</div>
        <div className="stat-value">{value}</div>
      </div>
    </div>
  );
}

function Dashboard({
  lang,
  filters
}: {
  lang: Language;
  filters: Filters;
}) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const result = await api.dashboard(
        makeParams(filters, false)
      );
      setData(result.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t(lang, "error")
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [filters.fromDate, filters.toDate]);

  if (loading) return <div className="loading">{t(lang, "loading")}</div>;

  if (error) return <div className="alert error">{error}</div>;

  if (!data) return null;

  return (
    <div>
      <div className="page-heading">
        <div>
          <h2>{t(lang, "dashboard")}</h2>
          <p>{t(lang, "welcome")}</p>
        </div>
        <button className="secondary-btn" onClick={load}>
          ↻ {t(lang, "refresh")}
        </button>
      </div>

      <div className="stats-grid">
        <StatCard
          title={t(lang, "totalSales")}
          value={`₹ ${money(data.sales.total)}`}
          icon="₹"
        />
        <StatCard
          title={t(lang, "salesCount")}
          value={String(data.sales.count)}
          icon="#"
        />
        <StatCard
          title={t(lang, "purchasesTotal")}
          value={`₹ ${money(data.purchases.total)}`}
          icon="P"
        />
        <StatCard
          title={t(lang, "collectionsTotal")}
          value={`₹ ${money(data.collections)}`}
          icon="C"
        />
        <StatCard
          title={t(lang, "expensesTotal")}
          value={`₹ ${money(data.expenses)}`}
          icon="E"
        />
        <StatCard
          title={t(lang, "lowStock")}
          value={String(data.lowStockCount)}
          icon="!"
        />
        <StatCard
          title={t(lang, "wastageCount")}
          value={String(data.wastageCount)}
          icon="W"
        />
      </div>

      <div className="dashboard-panel">
        <h3>{t(lang, "reports")}</h3>
        <p className="muted">{t(lang, "reportDateHint")}</p>
      </div>
    </div>
  );
}

function FiltersBar({
  lang,
  filters,
  setFilters,
  report,
  onSearch,
  onExport,
  onPrint
}: {
  lang: Language;
  filters: Filters;
  setFilters: Dispatch<SetStateAction<Filters>>;
  report: ReportKey;
  onSearch: () => void;
  onExport: () => void;
  onPrint: () => void;
}) {
  return (
    <div className="filters">
      <div className="field">
        <label>{t(lang, "fromDate")}</label>
        <input
          type="date"
          value={filters.fromDate}
          onChange={(e) =>
            setFilters((old) => ({
              ...old,
              fromDate: e.target.value
            }))
          }
        />
      </div>

      <div className="field">
        <label>{t(lang, "toDate")}</label>
        <input
          type="date"
          value={filters.toDate}
          onChange={(e) =>
            setFilters((old) => ({
              ...old,
              toDate: e.target.value
            }))
          }
        />
      </div>

      {report === "sales" && (
        <div className="field">
          <label>{t(lang, "status")}</label>
          <select
            value={filters.status}
            onChange={(e) =>
              setFilters((old) => ({
                ...old,
                status: e.target.value as Filters["status"]
              }))
            }
          >
            <option value="POSTED">{t(lang, "posted")}</option>
            <option value="DRAFT">{t(lang, "draft")}</option>
            <option value="ALL">{t(lang, "all")}</option>
          </select>
        </div>
      )}

      <div className="filter-actions">
        <button className="primary-btn" onClick={onSearch}>
          🔎 {t(lang, "search")}
        </button>
        <button className="secondary-btn" onClick={onExport}>
          ↓ {t(lang, "exportCsv")}
        </button>
        <button className="secondary-btn" onClick={onPrint}>
          🖨 {t(lang, "print")}
        </button>
      </div>
    </div>
  );
}

function ReportTable({
  lang,
  report,
  rows
}: {
  lang: Language;
  report: ReportKey;
  rows: any[];
}) {
  const cell = (value: any) =>
    value === null || value === undefined ? "" : String(value);

  if (!rows.length) {
    return (
      <div className="empty">
        <div className="empty-icon">∅</div>
        {t(lang, "noData")}
      </div>
    );
  }

  let headers: string[] = [];
  let renderRow: (row: any) => React.ReactNode[] = () => [];

  if (report === "sales") {
    headers = [
      t(lang, "invoice"),
      t(lang, "date"),
      t(lang, "saleType"),
      t(lang, "status"),
      t(lang, "party"),
      t(lang, "person"),
      t(lang, "grandTotal"),
      t(lang, "paid"),
      t(lang, "due")
    ];

    renderRow = (r) => [
      cell(r.invoiceNo),
      dateTime(r.saleDate),
      cell(r.saleType),
      cell(r.status),
      cell(r.party?.name),
      cell(r.person?.name),
      `₹ ${money(r.grandTotal)}`,
      `₹ ${money(r.paidAmount)}`,
      `₹ ${money(r.outstanding)}`
    ];
  }

  if (report === "salesFood") {
    headers = [
      t(lang, "foodItem"),
      t(lang, "quantity"),
      t(lang, "amount")
    ];

    renderRow = (r) => [
      getLocalized(lang, r.nameEn, r.nameHi) || cell(r.name),
      cell(r.quantity),
      `₹ ${money(r.amount)}`
    ];
  }

  if (report === "salesDepartment") {
    headers = [
      t(lang, "department"),
      t(lang, "salesCount"),
      t(lang, "amount")
    ];

    renderRow = (r) => [
      getLocalized(
        lang,
        r.departmentNameEn,
        r.departmentNameHi
      ) || cell(r.departmentName),
      cell(r.count),
      `₹ ${money(r.total)}`
    ];
  }

  if (report === "purchases") {
    headers = [
      "Purchase No",
      t(lang, "date"),
      t(lang, "status"),
      t(lang, "supplier"),
      "Invoice",
      t(lang, "grandTotal")
    ];

    renderRow = (r) => [
      cell(r.purchaseNo),
      dateTime(r.purchaseDate),
      cell(r.status),
      getLocalized(
        lang,
        r.supplier?.nameEn,
        r.supplier?.nameHi
      ) || cell(r.supplier?.name),
      cell(r.invoiceNo),
      `₹ ${money(r.total)}`
    ];
  }

  if (report === "collections") {
    headers = [
      t(lang, "receipt"),
      t(lang, "date"),
      t(lang, "party"),
      t(lang, "paymentMode"),
      t(lang, "amount"),
      "Reference"
    ];

    renderRow = (r) => [
      cell(r.receiptNo),
      dateTime(r.paymentDate),
      getLocalized(
        lang,
        r.party?.nameEn,
        r.party?.nameHi
      ) || cell(r.party?.name),
      cell(r.paymentMode),
      `₹ ${money(r.amount)}`,
      cell(r.referenceNo)
    ];
  }

  if (report === "outstanding") {
    headers = [
      t(lang, "party"),
      "Debit",
      "Credit",
      t(lang, "due")
    ];

    renderRow = (r) => [
      getLocalized(lang, r.partyNameEn, r.partyNameHi) ||
        cell(r.partyName),
      `₹ ${money(r.debit)}`,
      `₹ ${money(r.credit)}`,
      `₹ ${money(r.outstanding)}`
    ];
  }

  if (report === "expenses") {
    headers = [
      t(lang, "date"),
      t(lang, "category"),
      t(lang, "amount"),
      t(lang, "description"),
      "Reference"
    ];

    renderRow = (r) => [
      dateTime(r.expenseDate),
      cell(r.category),
      `₹ ${money(r.amount)}`,
      cell(r.description),
      cell(r.referenceNo)
    ];
  }

  if (report === "stock") {
    headers = [
      t(lang, "foodItem"),
      "Unit",
      t(lang, "currentStock"),
      t(lang, "minimumStock"),
      t(lang, "maximumStock"),
      t(lang, "stockStatus")
    ];

    renderRow = (r) => [
      getLocalized(lang, r.nameEn, r.nameHi) ||
        cell(r.name),
      cell(r.unit?.shortName),
      cell(r.currentStock),
      cell(r.minimumStock),
      cell(r.maximumStock),
      cell(r.stockStatus)
    ];
  }

  if (report === "stockMovements") {
    headers = [
      t(lang, "date"),
      t(lang, "transactionType"),
      t(lang, "foodItem"),
      t(lang, "quantity"),
      "Rate",
      "Reference",
      t(lang, "description")
    ];

    renderRow = (r) => [
      dateTime(r.transactionDate),
      cell(r.transactionType),
      getLocalized(
        lang,
        r.foodItem?.nameEn,
        r.foodItem?.nameHi
      ) || cell(r.foodItem?.name),
      cell(r.quantity),
      `₹ ${money(r.unitRate)}`,
      `${cell(r.referenceType)} ${cell(r.referenceId)}`,
      cell(r.remarks)
    ];
  }

  if (report === "wastage") {
    headers = [
      t(lang, "date"),
      t(lang, "foodItem"),
      t(lang, "quantity"),
      t(lang, "reason"),
      t(lang, "description")
    ];

    renderRow = (r) => [
      dateTime(r.wastageDate),
      getLocalized(
        lang,
        r.foodItem?.nameEn,
        r.foodItem?.nameHi
      ) || cell(r.foodItem?.name),
      cell(r.quantity),
      cell(r.reason),
      cell(r.remarks)
    ];
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {headers.map((h, index) => (
              <th key={`${h}-${index}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const values = renderRow(row);
            return (
              <tr key={row.id ?? index}>
                {values.map((value, i) => (
                  <td key={i}>{value}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ReportsPage({
  lang,
  report,
  filters,
  setFilters
}: {
  lang: Language;
  report: ReportKey;
  filters: Filters;
  setFilters: Dispatch<SetStateAction<Filters>>;
}) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const label = reportLabels[report][lang];

  const load = async () => {
    setLoading(true);
    setError("");

    try {
      const params = makeParams(
        filters,
        report === "sales"
      );

      let result: any;

      switch (report) {
        case "sales":
          result = await api.sales(params);
          break;
        case "salesFood":
          result = await api.salesFood(params);
          break;
        case "salesDepartment":
          result = await api.salesDepartment(params);
          break;
        case "purchases":
          result = await api.purchases(params);
          break;
        case "collections":
          result = await api.collections(params);
          break;
        case "outstanding":
          result = await api.outstanding(params);
          break;
        case "expenses":
          result = await api.expenses(params);
          break;
        case "stock":
          result = await api.stock(params);
          break;
        case "stockMovements":
          result = await api.stockMovements(params);
          break;
        case "wastage":
          result = await api.wastage(params);
          break;
      }

      setRows(Array.isArray(result?.data) ? result.data : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t(lang, "error")
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [report]);

  const printReport = () => {
    window.print();
  };

  return (
    <div>
      <div className="page-heading">
        <div>
          <h2>{label}</h2>
          <p>{t(lang, "reportDateHint")}</p>
        </div>
        <span className="record-count">
          {rows.length} records
        </span>
      </div>

      <FiltersBar
        lang={lang}
        filters={filters}
        setFilters={setFilters}
        report={report}
        onSearch={load}
        onExport={() => downloadCsv(report, filters)}
        onPrint={printReport}
      />

      {loading && (
        <div className="loading">{t(lang, "loading")}</div>
      )}

      {error && (
        <div className="alert error">{error}</div>
      )}

      {!loading && !error && (
        <ReportTable
          lang={lang}
          report={report}
          rows={rows}
        />
      )}
    </div>
  );
}

function App() {
  const [lang, setLang] = useState<Language>(
    (localStorage.getItem("canteen_language") as Language) ||
      "en"
  );

  const [authenticated, setAuthenticated] = useState(
    Boolean(getToken())
  );

  const [page, setPage] = useState<
    "dashboard" | ReportKey | string
  >("dashboard");

  const [filters, setFilters] = useState<Filters>({
    fromDate: "",
    toDate: "",
    status: "POSTED"
  });

  useEffect(() => {
    const handler = () => setAuthenticated(false);
    window.addEventListener("auth-expired", handler);

    return () =>
      window.removeEventListener("auth-expired", handler);
  }, []);

  const changeLanguage = (value: Language) => {
    setLang(value);
    localStorage.setItem("canteen_language", value);
  };

  const logout = () => {
    clearToken();
    setAuthenticated(false);
  };

  if (!authenticated) {
    return (
      <Login
        lang={lang}
        onLoggedIn={() => setAuthenticated(true)}
      />
    );
  }

  const navGroups = [
    {
      title: "Operations",
      items: [
        { key: "sale", label: lang === "hi" ? "नई बिक्री / बिलिंग" : "New Sale / Billing", icon: "₹" },
        { key: "payment", label: lang === "hi" ? "भुगतान प्राप्त करें" : "Receive Payment", icon: "C" },
        { key: "purchase", label: lang === "hi" ? "खरीद" : "Purchase Entry", icon: "P" },
        { key: "bulk", label: lang === "hi" ? "बल्क एंट्री" : "Bulk Entry", icon: "B" },
      ]
    },
    {
      title: "Masters",
      items: [
        { key: "departments", label: lang === "hi" ? "विभाग" : "Departments", icon: "D" },
        { key: "parties", label: lang === "hi" ? "पार्टी" : "Party Accounts", icon: "A" },
        { key: "persons", label: lang === "hi" ? "व्यक्ति / कर्मचारी" : "Persons / Employees", icon: "U" },
        { key: "categories", label: lang === "hi" ? "खाद्य श्रेणियां" : "Food Categories", icon: "C" },
        { key: "food-items", label: lang === "hi" ? "खाद्य सामग्री" : "Food Items", icon: "F" },
        { key: "units", label: lang === "hi" ? "इकाई" : "Units", icon: "#" },
        { key: "suppliers", label: lang === "hi" ? "आपूर्तिकर्ता" : "Suppliers", icon: "S" },
        { key: "rates", label: lang === "hi" ? "रेट मास्टर" : "Rate Master", icon: "R" },
      ]
    },
    {
      title: "Accounts & Inventory",
      items: [
        { key: "ledger", label: lang === "hi" ? "पार्टी लेजर" : "Party Ledger", icon: "L" },
        { key: "outstanding", label: lang === "hi" ? "बकाया" : "Outstanding", icon: "O" },
        { key: "inventory", label: lang === "hi" ? "स्टॉक" : "Inventory / Stock", icon: "I" },
        { key: "wastage", label: lang === "hi" ? "बर्बादी" : "Wastage", icon: "W" },
        { key: "expenses-entry", label: lang === "hi" ? "व्यय दर्ज करें" : "Expense Entry", icon: "E" },
      ]
    },
    {
      title: t(lang, "reports"),
      items: [
        { key: "dashboard", label: t(lang, "dashboard"), icon: "▦" },
        { key: "sales", label: t(lang, "sales"), icon: "₹" },
        { key: "salesFood", label: t(lang, "salesFood"), icon: "F" },
        { key: "salesDepartment", label: t(lang, "salesDepartment"), icon: "D" },
        { key: "purchases", label: t(lang, "purchases"), icon: "P" },
        { key: "collections", label: t(lang, "collections"), icon: "C" },
        { key: "outstanding", label: t(lang, "outstanding"), icon: "L" },
        { key: "expenses", label: t(lang, "expenses"), icon: "E" },
        { key: "stock", label: t(lang, "stock"), icon: "S" },
        { key: "stockMovements", label: t(lang, "stockMovements"), icon: "M" },
        { key: "wastage", label: t(lang, "wastage"), icon: "W" }
      ]
    }
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark small">VK</div>
          <div>
            <strong>VK Canteen</strong>
            <span>Management System</span>
          </div>
        </div>

        <nav>
          {navGroups.map((group) => (
            <div key={group.title} className="nav-group">
              <div className="nav-title">{group.title}</div>

              {group.items.map((item) => (
                <button
                  key={item.key}
                  className={`nav-item ${
                    page === item.key ? "active" : ""
                  }`}
                  onClick={() => setPage(item.key)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button className="logout-btn" onClick={logout}>
            ↪ {t(lang, "logout")}
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <strong>{t(lang, "appTitle")}</strong>
          </div>

          <div className="topbar-right">
            <span className="online-dot">● Online</span>
            <button
              className="icon-btn"
              onClick={() =>
                changeLanguage(lang === "en" ? "hi" : "en")
              }
            >
              {lang === "en" ? "हिंदी" : "English"}
            </button>
          </div>
        </header>

        <div className="content">
          {page === "dashboard" ? (
            <Dashboard lang={lang} filters={filters} />
          ) : (["sales", "salesFood", "salesDepartment", "purchases", "collections", "outstanding", "expenses", "stock", "stockMovements", "wastage"].includes(page) ? (
            <ReportsPage lang={lang} report={page as ReportKey} filters={filters} setFilters={setFilters} />
          ) : (
            <ModulePage module={page} lang={lang} />
          ))}
        </div>
      </main>
    </div>
  );
}

export default App;