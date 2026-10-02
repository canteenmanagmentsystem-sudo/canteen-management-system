export const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export function getToken(): string | null {
  return (
    localStorage.getItem("canteen_token") ||
    localStorage.getItem("token")
  );
}

export function setToken(token: string) {
  localStorage.setItem("canteen_token", token);
}

export function clearToken() {
  localStorage.removeItem("canteen_token");
  localStorage.removeItem("token");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  let body: any = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (response.status === 401) {
    clearToken();
    window.dispatchEvent(new Event("auth-expired"));
  }

  if (!response.ok) {
    throw new Error(
      body?.message || `Request failed with status ${response.status}`
    );
  }

  return body as T;
}

export interface ApiResult<T> {
  success: boolean;
  data: T;
  count?: number;
  total?: number;
}

export const api = {
  login: (username: string, password: string) =>
    request<any>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password })
    }),

  me: () => request<any>("/auth/me"),

  dashboard: (params = "") =>
    request<any>(`/reports/dashboard${params}`),

  sales: (params = "") =>
    request<any>(`/reports/sales${params}`),

  salesFood: (params = "") =>
    request<any>(`/reports/sales-by-food-item${params}`),

  salesDepartment: (params = "") =>
    request<any>(`/reports/sales-by-department${params}`),

  purchases: (params = "") =>
    request<any>(`/reports/purchases${params}`),

  collections: (params = "") =>
    request<any>(`/reports/collections${params}`),

  outstanding: (params = "") =>
    request<any>(`/reports/outstanding${params}`),

  expenses: (params = "") =>
    request<any>(`/reports/expenses${params}`),

  stock: (params = "") =>
    request<any>(`/reports/stock${params}`),

  stockMovements: (params = "") =>
    request<any>(`/reports/stock-movements${params}`),

  wastage: (params = "") =>
    request<any>(`/reports/wastage${params}`)
};