// DSMS API client wired to the FastAPI backend
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions<TBody> {
  method?: HttpMethod;
  body?: TBody;
  token?: string | null;
  signal?: AbortSignal;
}

async function request<TResponse, TBody = unknown>(
  path: string,
  options: RequestOptions<TBody> = {}
): Promise<TResponse> {
  const { method = "GET", body, token, signal } = options;

  const headers: HeadersInit = {};

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  if (!res.ok) {
    let message = "Request failed";
    try {
      const data = (await res.json()) as { detail?: string };
      if (data.detail) message = data.detail;
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(message);
  }

  if (res.status === 204) {
    return undefined as TResponse;
  }

  return (await res.json()) as TResponse;
}

async function requestForm<TResponse>(path: string, form: URLSearchParams) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  if (!res.ok) {
    let message = "Request failed";
    try {
      const data = (await res.json()) as { detail?: string };
      if (data.detail) message = data.detail;
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(message);
  }

  return (await res.json()) as TResponse;
}

// ---------- Shared frontend-only helpers ----------

// Simple shape used by some new pages for pagination-style UIs.
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

// ---------- Auth & User ----------

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export type LoginResponse = TokenResponse;

export interface RoleResponse {
  id: number;
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface UserResponse {
  id: number;
  username: string;
  email?: string;
  full_name?: string;
  is_active?: boolean;
  roles?: RoleResponse[];
}

export type User = UserResponse;

export async function login(
  username: string,
  password: string
): Promise<LoginResponse> {
  const form = new URLSearchParams();
  form.append("username", username);
  form.append("password", password);
  form.append("grant_type", "");

  return requestForm<LoginResponse>("/api/v1/auth/login", form);
}

export async function refreshToken(
  refresh_token: string
): Promise<TokenResponse> {
  const query = new URLSearchParams({ refresh_token });
  return request<TokenResponse>(`/api/v1/auth/refresh?${query.toString()}`, {
    method: "POST",
  });
}

// Normalize backend user payload (e.g. UserID/Username/FullName) into UI-friendly shape
export async function getCurrentUser(
  accessToken: string
): Promise<UserResponse> {
  const raw = await request<any>("/api/v1/auth/me", {
    method: "GET",
    token: accessToken,
  });

  return {
    id: raw.UserID ?? raw.id,
    username: raw.Username ?? raw.username,
    email: raw.Email ?? raw.email,
    full_name: raw.FullName ?? raw.full_name,
    is_active: raw.IsActive ?? raw.is_active,
    roles: raw.roles,
  };
}

// ---------- Items ----------

export interface ItemResponse {
  id: number;
  name: string;
  sku: string;
  is_spare_part?: boolean;
  is_active?: boolean;
  minimum_level?: number;
  maximum_level?: number;
}

export type Item = ItemResponse;

export interface ListItemsParams {
  is_spare_part?: boolean;
  is_active?: boolean;
  search?: string;
}

export async function listItems(
  params: ListItemsParams = {},
  token?: string | null
): Promise<ItemResponse[]> {
  const query = new URLSearchParams();
  if (params.is_spare_part !== undefined) {
    query.append("is_spare_part", String(params.is_spare_part));
  }
  if (params.is_active !== undefined) {
    query.append("is_active", String(params.is_active));
  }
  if (params.search) {
    query.append("search", params.search);
  }

  const qs = query.toString();
  const path = qs ? `/api/v1/items/?${qs}` : "/api/v1/items/";

  return request<ItemResponse[]>(path, { method: "GET", token });
}

export async function createItem(
  body: Partial<ItemResponse>,
  token?: string | null
): Promise<ItemResponse> {
  return request<ItemResponse>("/api/v1/items/", {
    method: "POST",
    body,
    token,
  });
}

export async function updateItem(
  itemId: number,
  body: Partial<ItemResponse>,
  token?: string | null
): Promise<ItemResponse> {
  return request<ItemResponse>(`/api/v1/items/${itemId}`, {
    method: "PUT",
    body,
    token,
  });
}

export async function deleteItem(
  itemId: number,
  token?: string | null
): Promise<void> {
  await request<void>(`/api/v1/items/${itemId}`, {
    method: "DELETE",
    token,
  });
}

// Richer item shape matching backend fields (for admin Items page)
export interface BackendItem {
  ItemID: number;
  SKU: string;
  ItemName: string;
  Description?: string | null;
  UnitOfMeasure: string;
  CategoryID?: number | null;
  IsSparePart: boolean;
  IsActive: boolean;
}

export interface ListItemsWithFiltersParams extends ListItemsParams {
  category_id?: number;
  label_id?: number;
}

export async function listItemsWithFilters(
  params: ListItemsWithFiltersParams = {},
  token?: string | null
): Promise<BackendItem[]> {
  const query = new URLSearchParams();
  if (params.is_spare_part !== undefined) {
    query.append("is_spare_part", String(params.is_spare_part));
  }
  if (params.is_active !== undefined) {
    query.append("is_active", String(params.is_active));
  }
  if (params.category_id !== undefined) {
    query.append("category_id", String(params.category_id));
  }
  if (params.label_id !== undefined) {
    query.append("label_id", String(params.label_id));
  }
  if (params.search) {
    query.append("search", params.search);
  }

  const qs = query.toString();
  const path = qs ? `/api/v1/items/?${qs}` : "/api/v1/items/";
  return request<BackendItem[]>(path, { method: "GET", token });
}

// ---------- Item Categories & Labels ----------

export interface ItemCategory {
  CategoryID: number;
  CategoryName: string;
  Description?: string | null;
  ParentCategoryID?: number | null;
  DisplayOrder: number;
  IsActive: boolean;
}

export interface CategoryImportPreviewRow {
  row_index: number;
  raw: {
    category_name: string;
    parent_category: string;
    description: string;
    is_active: string;
  };
  normalized: {
    category_name: string;
    parent_category: string | null;
  };
  status: string;
  issues: string[];
  notes?: string[];
}

export async function listItemCategories(
  includeInactive = false,
  token?: string | null
): Promise<ItemCategory[]> {
  const query = new URLSearchParams();
  if (includeInactive) query.append("include_inactive", "true");
  const qs = query.toString();
  const path = qs
    ? `/api/v1/item-categories/?${qs}`
    : "/api/v1/item-categories/";
  return request<ItemCategory[]>(path, { method: "GET", token });
}

export interface CreateItemCategoryRequest {
  category_name: string;
  description?: string | null;
  parent_category_id?: number | null;
  display_order?: number;
  is_active?: boolean;
}

export interface UpdateItemCategoryRequest {
  category_name?: string;
  description?: string | null;
  parent_category_id?: number | null;
  display_order?: number;
  is_active?: boolean;
}

export async function createItemCategory(
  body: CreateItemCategoryRequest,
  token?: string | null
): Promise<ItemCategory> {
  return request<ItemCategory>("/api/v1/item-categories/", {
    method: "POST",
    body,
    token,
  });
}

export async function updateItemCategory(
  categoryId: number,
  body: UpdateItemCategoryRequest,
  token?: string | null
): Promise<ItemCategory> {
  return request<ItemCategory>(`/api/v1/item-categories/${categoryId}`, {
    method: "PUT",
    body,
    token,
  });
}

export async function deactivateItemCategory(
  categoryId: number,
  token?: string | null
): Promise<void> {
  await request<void>(`/api/v1/item-categories/${categoryId}`, {
    method: "DELETE",
    token,
  });
}

export async function previewCategoryImport(
  file: File,
  token?: string | null
): Promise<{ rows: CategoryImportPreviewRow[] }> {
  const formData = new FormData();
  formData.append("file", file);

  const headers: HeadersInit = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(
    `${API_BASE_URL}/api/v1/item-categories/import/preview`,
    {
      method: "POST",
      headers,
      body: formData,
    }
  );

  if (!res.ok) {
    let message = "Preview failed";
    try {
      const data = (await res.json()) as { detail?: string };
      if (data.detail) message = data.detail;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const json = (await res.json()) as { rows?: CategoryImportPreviewRow[] };
  return { rows: json.rows ?? [] };
}

export async function commitCategoryImport(
  rows: CategoryImportPreviewRow[],
  token?: string | null
): Promise<{
  created_count: number;
  updated_count: number;
  failed_rows: unknown[];
}> {
  return request("/api/v1/item-categories/import/commit", {
    method: "POST",
    body: { rows },
    token,
  });
}

export interface LabelDto {
  LabelID: number;
  LabelName: string;
  LabelColor?: string | null;
  LabelGroup?: string | null;
  Description?: string | null;
  IsActive: boolean;
}

export async function listLabels(
  includeInactive = false,
  token?: string | null
): Promise<LabelDto[]> {
  const query = new URLSearchParams();
  if (includeInactive) query.append("include_inactive", "true");
  const qs = query.toString();
  const path = qs ? `/api/v1/labels/?${qs}` : "/api/v1/labels/";
  return request<LabelDto[]>(path, { method: "GET", token });
}

export async function getItemLabels(
  itemId: number,
  token?: string | null
): Promise<LabelDto[]> {
  return request<LabelDto[]>(`/api/v1/items/${itemId}/labels`, {
    method: "GET",
    token,
  });
}

export async function setItemLabels(
  itemId: number,
  labelIds: number[],
  token?: string | null
): Promise<void> {
  await request<void>(`/api/v1/items/${itemId}/labels`, {
    method: "POST",
    body: { label_ids: labelIds },
    token,
  });
}

export interface CreateLabelRequest {
  label_name: string;
  label_color?: string | null;
  label_group?: string | null;
  description?: string | null;
  is_active?: boolean;
}

export interface UpdateLabelRequest {
  label_name?: string;
  label_color?: string | null;
  label_group?: string | null;
  description?: string | null;
  is_active?: boolean;
}

export async function createLabel(
  body: CreateLabelRequest,
  token?: string | null
): Promise<LabelDto> {
  return request<LabelDto>("/api/v1/labels/", {
    method: "POST",
    body,
    token,
  });
}

export async function updateLabel(
  labelId: number,
  body: UpdateLabelRequest,
  token?: string | null
): Promise<LabelDto> {
  return request<LabelDto>(`/api/v1/labels/${labelId}`, {
    method: "PUT",
    body,
    token,
  });
}

export async function deactivateLabel(
  labelId: number,
  token?: string | null
): Promise<void> {
  await request<void>(`/api/v1/labels/${labelId}`, {
    method: "DELETE",
    token,
  });
}

// ---------- Stores & Stock ----------

export interface StoreResponse {
  id: number;
  name: string;
  code?: string;
  is_active?: boolean;
}

export type Store = StoreResponse;

export interface ListStoresParams {
  search?: string;
  is_active?: boolean;
}

export async function listStores(
  params: ListStoresParams = {},
  token?: string | null
): Promise<StoreResponse[]> {
  const query = new URLSearchParams();
  if (params.search) query.append("search", params.search);
  if (params.is_active !== undefined) {
    query.append("is_active", String(params.is_active));
  }

  const qs = query.toString();
  const path = qs ? `/api/v1/stores/?${qs}` : "/api/v1/stores/";
  return request<StoreResponse[]>(path, { method: "GET", token });
}

export interface StoreStockItem {
  item_id: number;
  sku: string;
  name: string;
  current_qty: number;
  reserved_qty?: number;
  minimum_level?: number;
  maximum_level?: number;
}

export async function getStoreStock(
  storeId: number,
  token?: string | null
): Promise<StoreStockItem[]> {
  return request<StoreStockItem[]>(`/api/v1/stores/${storeId}/stock`, {
    method: "GET",
    token,
  });
}

export async function getLowStockItems(
  token?: string | null
): Promise<StoreStockItem[]> {
  return request<StoreStockItem[]>("/api/v1/stock/low-stock", {
    method: "GET",
    token,
  });
}

export interface StockAvailabilityResponse {
  item_id: number;
  available_qty: number;
}

export async function checkStockAvailability(
  itemId: number,
  token?: string | null
): Promise<StockAvailabilityResponse> {
  return request<StockAvailabilityResponse>(
    `/api/v1/stock/availability?item_id=${itemId}`,
    {
      method: "GET",
      token,
    }
  );
}

export interface StockMovement {
  id: number;
  item_id: number;
  store_id: number;
  quantity: number;
  direction: "IN" | "OUT";
  created_at: string;
}

export interface StockMovementsParams {
  store_id?: number;
  item_id?: number;
  limit?: number;
  offset?: number;
}

export async function getStockMovements(
  params: StockMovementsParams = {},
  token?: string | null
): Promise<StockMovement[]> {
  const query = new URLSearchParams();
  if (params.store_id !== undefined)
    query.append("store_id", String(params.store_id));
  if (params.item_id !== undefined)
    query.append("item_id", String(params.item_id));
  if (params.limit !== undefined)
    query.append("limit", String(params.limit));
  if (params.offset !== undefined)
    query.append("offset", String(params.offset));

  const qs = query.toString();
  const path = qs
    ? `/api/v1/stock/movements?${qs}`
    : "/api/v1/stock/movements";

  return request<StockMovement[]>(path, { method: "GET", token });
}

export interface AdjustStockQuery {
  store_id: number;
  item_id: number;
  quantity_delta: number;
  reason?: string;
}

export async function adjustStock(
  body: AdjustStockQuery,
  token?: string | null
): Promise<void> {
  await request<void>("/api/v1/stock/adjust", {
    method: "POST",
    body,
    token,
  });
}

// ---------- Machinery ----------

export interface MachineryTypeResponse {
  MachineryTypeID: number;
  TypeName: string;
  Description?: string;
  IsActive: boolean;
}

export interface MachineryResponse {
  MachineryID: number;
  AssetTag: string;
  MachineName: string;
  MachineryTypeID: number;
  Location?: string;
  Status: string;
  IsActive: boolean;
}

export type MachineryType = MachineryTypeResponse;
export type Machinery = {
  id: number;
  code: string;
  name: string;
  type_id: number;
  type_name?: string;
  status: "OPERATIONAL" | "MAINTENANCE" | "OUT_OF_SERVICE" | string;
  location?: string;
};

export interface MachineryHistoryEntry {
  id: number;
  event_type: string;
  description?: string;
  performed_by_user_id?: number;
  related_request_id?: number;
  related_mro_detail_id?: number;
  status_before?: string;
  status_after?: string;
  downtime_hours?: number | null;
  actual_downtime_hours?: number | null;
  maintenance_start_at?: string | null;
  maintenance_completed_at?: string | null;
  cost?: number | null;
  notes?: string | null;
  created_at: string;
}

export interface MachineryImportPreviewRow {
  row_index: number;
  raw: {
    asset_tag: string;
    machine_name: string;
    machinery_type: string;
    location: string;
    status: string;
  };
  normalized: {
    asset_tag: string;
    machinery_type: string;
  };
  status: string;
  issues: string[];
  notes?: string[];
  auto_generated_asset_tag?: boolean;
  resolved_type_id?: number | null;
}

export interface ListMachineryTypesParams {
  search?: string;
}

export async function listMachineryTypes(
  params: ListMachineryTypesParams = {},
  token?: string | null
): Promise<MachineryTypeResponse[]> {
  const query = new URLSearchParams();
  if (params.search) query.append("search", params.search);
  const qs = query.toString();
  const path = qs
    ? `/api/v1/machinery/types?${qs}`
    : "/api/v1/machinery/types";

  return request<MachineryTypeResponse[]>(path, { method: "GET", token });
}

export async function createMachineryType(
  body: { type_name: string; description?: string },
  token?: string | null
): Promise<MachineryTypeResponse> {
  return request<MachineryTypeResponse>("/api/v1/machinery/types", {
    method: "POST",
    body,
    token,
  });
}

export async function updateMachineryType(
  typeId: number,
  body: { type_name?: string; description?: string; is_active?: boolean },
  token?: string | null
): Promise<MachineryTypeResponse> {
  return request<MachineryTypeResponse>(`/api/v1/machinery/types/${typeId}`, {
    method: "PUT",
    body,
    token,
  });
}

export interface ListMachineryByTypeParams {
  search?: string;
  status?: string;
}

export async function listMachineryByType(
  typeId: number,
  params: ListMachineryByTypeParams = {},
  token?: string | null
): Promise<Machinery[]> {
  const query = new URLSearchParams();
  if (params.search) query.append("search", params.search);
  if (params.status) query.append("status", params.status);

  const qs = query.toString();
  const path = qs
    ? `/api/v1/machinery/types/${typeId}/machinery?${qs}`
    : `/api/v1/machinery/types/${typeId}/machinery`;

  const raw = await request<MachineryResponse[]>(path, {
    method: "GET",
    token,
  });

  // Map backend machinery shape into the UI-friendly Machinery type
  return raw.map((m) => ({
    id: m.MachineryID,
    code: m.AssetTag,
    name: m.MachineName,
    type_id: m.MachineryTypeID,
    status: m.Status,
    location: m.Location,
  }));
}

export async function createMachinery(
  body: Partial<MachineryResponse>,
  token?: string | null
): Promise<MachineryResponse> {
  return request<MachineryResponse>("/api/v1/machinery/", {
    method: "POST",
    body,
    token,
  });
}

export async function getMachinery(
  machineryId: number,
  token?: string | null
): Promise<MachineryResponse> {
  return request<MachineryResponse>(`/api/v1/machinery/${machineryId}`, {
    method: "GET",
    token,
  });
}

export async function updateMachinery(
  machineryId: number,
  body: Partial<MachineryResponse>,
  token?: string | null
): Promise<MachineryResponse> {
  return request<MachineryResponse>(`/api/v1/machinery/${machineryId}`, {
    method: "PUT",
    body,
    token,
  });
}

export async function deleteMachinery(
  machineryId: number,
  token?: string | null
): Promise<void> {
  await request<void>(`/api/v1/machinery/${machineryId}`, {
    method: "DELETE",
    token,
  });
}

export async function startMaintenance(
  machineryId: number,
  reason?: string,
  token?: string | null
): Promise<MachineryResponse> {
  return request<MachineryResponse>(`/api/v1/machinery/${machineryId}/maintenance/start`, {
    method: "POST",
    body: { reason: reason || undefined },
    token,
  });
}

export async function endMaintenance(
  machineryId: number,
  notes?: string,
  token?: string | null
): Promise<MachineryResponse> {
  return request<MachineryResponse>(`/api/v1/machinery/${machineryId}/maintenance/end`, {
    method: "POST",
    body: { notes: notes || undefined },
    token,
  });
}

export async function getMachineryHistory(
  machineryId: number,
  token?: string | null
): Promise<MachineryHistoryEntry[]> {
  const raw = await request<{
    machinery_id: number;
    history: MachineryHistoryEntry[];
  }>(`/api/v1/machinery/${machineryId}/history`, {
    method: "GET",
    token,
  });

  return raw.history ?? [];
}

export async function previewMachineryImport(
  file: File,
  token?: string | null
): Promise<{ rows: MachineryImportPreviewRow[]; existing_machine_names: string[] }> {
  const formData = new FormData();
  formData.append("file", file);

  const headers: HeadersInit = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(
    `${API_BASE_URL}/api/v1/machinery/import/preview`,
    {
      method: "POST",
      headers,
      body: formData,
    }
  );

  if (!res.ok) {
    let message = "Preview failed";
    try {
      const data = (await res.json()) as { detail?: string };
      if (data.detail) message = data.detail;
  } catch {
      // ignore
    }
    throw new Error(message);
  }

  const json = (await res.json()) as {
    rows?: MachineryImportPreviewRow[];
    existing_machine_names?: string[];
  };
  return {
    rows: json.rows ?? [],
    existing_machine_names: json.existing_machine_names ?? [],
  };
}

export async function commitMachineryImport(
  rows: MachineryImportPreviewRow[],
  token?: string | null
): Promise<{
  created_count: number;
  created_type_count: number;
  failed_rows: unknown[];
}> {
  return request("/api/v1/machinery/import/commit", {
    method: "POST",
    body: { rows, auto_create_types: true },
    token,
  });
}

// ---------- Requests ----------

export type RequestStatus =
  | "PENDING"
  | "APPROVED"
  | "FULFILLED"
  | "REJECTED"
  | "CANCELLED";

export interface RequestResponse {
  id: number;
  external_id?: string;
  status: RequestStatus;
  priority?: string;
  store_id?: number;
  requester_id?: number;
  created_at: string;
}

// UI-only richer request shape used in some dashboard mocks
export interface Request {
  id: string | number;
  request_number?: string;
  requester_id?: string | number;
  requester?: User;
  item_id?: string | number;
  item?: Item;
  quantity?: number;
  priority?: "low" | "medium" | "high" | "critical" | string;
  status?:
    | "pending"
    | "approved"
    | "rejected"
    | "fulfilled"
    | "cancelled"
    | string;
  reason?: string;
  created_at: string;
  updated_at?: string;
}

export interface ListRequestsParams {
  status?: RequestStatus;
  limit?: number;
  offset?: number;
}

export async function listRequests(
  params: ListRequestsParams = {},
  token?: string | null
): Promise<RequestResponse[]> {
  const query = new URLSearchParams();
  if (params.status) query.append("status", params.status);
  if (params.limit !== undefined)
    query.append("limit", String(params.limit));
  if (params.offset !== undefined)
    query.append("offset", String(params.offset));

  const qs = query.toString();
  const path = qs ? `/api/v1/requests/?${qs}` : "/api/v1/requests/";

  return request<RequestResponse[]>(path, { method: "GET", token });
}

export async function createRequest(
  body: unknown,
  token?: string | null
): Promise<RequestResponse> {
  return request<RequestResponse>("/api/v1/requests/", {
    method: "POST",
    body,
    token,
  });
}

export async function getRequest(
  requestId: number,
  token?: string | null
): Promise<RequestResponse> {
  return request<RequestResponse>(`/api/v1/requests/${requestId}`, {
    method: "GET",
    token,
  });
}

export async function modifyRequest(
  requestId: number,
  body: unknown,
  token?: string | null
): Promise<RequestResponse> {
  return request<RequestResponse>(`/api/v1/requests/${requestId}`, {
    method: "PUT",
    body,
    token,
  });
}

export async function cancelRequest(
  requestId: number,
  reason: string,
  token?: string | null
): Promise<void> {
  await request<void>(`/api/v1/requests/${requestId}/cancel`, {
    method: "POST",
    body: { reason },
    token,
  });
}

// ---------- Approval ----------

export async function listPendingApprovals(
  token?: string | null
): Promise<RequestResponse[]> {
  return request<RequestResponse[]>("/api/v1/approval/pending", {
    method: "GET",
    token,
  });
}

export interface ApprovalContextResponse {
  request: RequestResponse;
}

export async function getApprovalContext(
  requestId: number,
  token?: string | null
): Promise<ApprovalContextResponse> {
  return request<ApprovalContextResponse>(
    `/api/v1/approval/${requestId}/context`,
    {
      method: "GET",
      token,
    }
  );
}

export async function approveRequest(
  requestId: number,
  override_expiry?: string,
  token?: string | null
): Promise<void> {
  const body: { override_expiry?: string } = {};
  if (override_expiry) body.override_expiry = override_expiry;

  await request<void>(`/api/v1/approval/${requestId}/approve`, {
    method: "POST",
    body,
    token,
  });
}

export async function rejectRequest(
  requestId: number,
  reason?: string,
  token?: string | null
): Promise<void> {
  const body: { reason?: string } = {};
  if (reason) body.reason = reason;

  await request<void>(`/api/v1/approval/${requestId}/reject`, {
    method: "POST",
    body,
    token,
  });
}

// ---------- Fulfillment ----------

export interface FulfillmentTaskResponse {
  id: number;
  request_id: number;
  store_id: number;
  status: string;
}

export async function listFulfillmentTasks(
  storeId?: number,
  token?: string | null
): Promise<FulfillmentTaskResponse[]> {
  const query = new URLSearchParams();
  if (storeId !== undefined) query.append("store_id", String(storeId));
  const qs = query.toString();
  const path = qs
    ? `/api/v1/fulfillment/tasks?${qs}`
    : "/api/v1/fulfillment/tasks";

  return request<FulfillmentTaskResponse[]>(path, { method: "GET", token });
}

export async function fulfillRequest(
  requestId: number,
  token?: string | null
): Promise<void> {
  await request<void>(`/api/v1/fulfillment/${requestId}/fulfill`, {
    method: "POST",
    token,
  });
}

// ---------- Roles & Privileges ----------

export interface PrivilegeResponse {
  id: number;
  code: string;
  name: string;
  category?: string;
}

export type Privilege = PrivilegeResponse;
export type Role = RoleResponse;

export interface ListRolesParams {
  search?: string;
  is_active?: boolean;
}

export async function listRoles(
  params: ListRolesParams = {},
  token?: string | null
): Promise<RoleResponse[]> {
  const query = new URLSearchParams();
  if (params.search) query.append("search", params.search);
  if (params.is_active !== undefined) {
    query.append("is_active", String(params.is_active));
  }
  const qs = query.toString();
  const path = qs ? `/api/v1/roles/?${qs}` : "/api/v1/roles/";

  return request<RoleResponse[]>(path, { method: "GET", token });
}

export async function createRole(
  body: Partial<RoleResponse>,
  token?: string | null
): Promise<RoleResponse> {
  return request<RoleResponse>("/api/v1/roles/", {
    method: "POST",
    body,
    token,
  });
}

export async function updateRole(
  roleId: number,
  body: Partial<RoleResponse>,
  token?: string | null
): Promise<RoleResponse> {
  return request<RoleResponse>(`/api/v1/roles/${roleId}`, {
    method: "PUT",
    body,
    token,
  });
}

export async function deleteRole(
  roleId: number,
  token?: string | null
): Promise<void> {
  await request<void>(`/api/v1/roles/${roleId}`, {
    method: "DELETE",
    token,
  });
}

export async function getRolePrivileges(
  roleId: number,
  token?: string | null
): Promise<PrivilegeResponse[]> {
  return request<PrivilegeResponse[]>(`/api/v1/roles/${roleId}/privileges`, {
    method: "GET",
    token,
  });
}

export async function assignPrivilegesToRole(
  roleId: number,
  privilegeIds: number[],
  token?: string | null
): Promise<void> {
  await request<void>(`/api/v1/roles/${roleId}/privileges`, {
    method: "POST",
    body: { privilege_ids: privilegeIds },
    token,
  });
}

export interface ListPrivilegesParams {
  search?: string;
  category?: string;
}

export async function listPrivileges(
  params: ListPrivilegesParams = {},
  token?: string | null
): Promise<PrivilegeResponse[]> {
  const query = new URLSearchParams();
  if (params.search) query.append("search", params.search);
  if (params.category) query.append("category", params.category);
  const qs = query.toString();
  const path = qs
    ? `/api/v1/privileges/?${qs}`
    : "/api/v1/privileges/";

  return request<PrivilegeResponse[]>(path, { method: "GET", token });
}

export interface PrivilegeCategoryResponse {
  id: number;
  name: string;
}

export async function listPrivilegeCategories(
  token?: string | null
): Promise<PrivilegeCategoryResponse[]> {
  return request<PrivilegeCategoryResponse[]>(
    "/api/v1/privileges/categories",
    {
      method: "GET",
      token,
    }
  );
}

// ---------- Users ----------

export interface ListUsersParams {
  search?: string;
  is_active?: boolean;
}

export async function listUsers(
  params: ListUsersParams = {},
  token?: string | null
): Promise<UserResponse[]> {
  const query = new URLSearchParams();
  if (params.search) query.append("search", params.search);
  if (params.is_active !== undefined) {
    query.append("is_active", String(params.is_active));
  }
  const qs = query.toString();
  const path = qs ? `/api/v1/users/?${qs}` : "/api/v1/users/";

  return request<UserResponse[]>(path, { method: "GET", token });
}

export async function createUser(
  body: Partial<UserResponse>,
  token?: string | null
): Promise<UserResponse> {
  return request<UserResponse>("/api/v1/users/", {
    method: "POST",
    body,
    token,
  });
}

export async function updateUser(
  userId: number,
  body: Partial<UserResponse>,
  token?: string | null
): Promise<UserResponse> {
  return request<UserResponse>(`/api/v1/users/${userId}`, {
    method: "PUT",
    body,
    token,
  });
}

export async function deleteUser(
  userId: number,
  token?: string | null
): Promise<void> {
  await request<void>(`/api/v1/users/${userId}`, {
    method: "DELETE",
    token,
  });
}

export async function getUserRoles(
  userId: number,
  token?: string | null
): Promise<RoleResponse[]> {
  return request<RoleResponse[]>(`/api/v1/users/${userId}/roles`, {
    method: "GET",
    token,
  });
}

export async function assignRolesToUser(
  userId: number,
  roleIds: number[],
  token?: string | null
): Promise<void> {
  await request<void>(`/api/v1/users/${userId}/roles`, {
    method: "POST",
    body: { role_ids: roleIds },
    token,
  });
}

export async function getUserPrivileges(
  userId: number,
  token?: string | null
): Promise<PrivilegeResponse[]> {
  const raw = await request<{ user_id: number; privileges: string[] }>(
    `/api/v1/users/${userId}/privileges`,
    {
      method: "GET",
      token,
    }
  );

  // Backend returns a list of privilege codes; convert them into
  // the UI Privilege shape (we only really care about .code here).
  return (raw.privileges ?? []).map((code, idx) => ({
    id: idx,
    code,
    name: code,
    category: undefined,
  }));
}

// ---------- Notifications ----------

export interface NotificationResponse {
  id: number;
  message: string;
  created_at: string;
  read?: boolean;
}

export type Notification = NotificationResponse;

export async function listNotifications(
  token?: string | null
): Promise<NotificationResponse[]> {
  return request<NotificationResponse[]>("/api/v1/notifications/", {
    method: "GET",
    token,
  });
}

// ---------- Activity Logs ----------

export interface ActivityLog {
  ActivityLogID: number;
  UserID: number | null;
  ActionType: string;
  ResourceType: string;
  ResourceID: number | null;
  ResourceIdentifier: string | null;
  IPAddress: string | null;
  UserAgent: string | null;
  RequestMethod: string | null;
  RequestPath: string | null;
  StatusCode: number | null;
  Metadata?: Record<string, unknown> | null;
  ErrorMessage?: string | null;
  CreatedAt: string;
  user_username?: string | null;
  user_full_name?: string | null;
}

export interface ActivityLogListResponse {
  items: ActivityLog[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ActivityLogFilters {
  user_id?: number;
  resource_type?: string;
  action_type?: string;
  resource_id?: number;
  start_date?: string;
  end_date?: string;
  status_code?: number;
  has_error?: boolean;
  page?: number;
  page_size?: number;
}

export async function listActivityLogs(
  params: ActivityLogFilters = {},
  token?: string | null
): Promise<ActivityLogListResponse> {
  const query = new URLSearchParams();
  if (params.user_id !== undefined) query.append("user_id", String(params.user_id));
  if (params.resource_type) query.append("resource_type", params.resource_type);
  if (params.action_type) query.append("action_type", params.action_type);
  if (params.resource_id !== undefined)
    query.append("resource_id", String(params.resource_id));
  if (params.start_date) query.append("start_date", params.start_date);
  if (params.end_date) query.append("end_date", params.end_date);
  if (params.status_code !== undefined)
    query.append("status_code", String(params.status_code));
  if (params.has_error !== undefined)
    query.append("has_error", String(params.has_error));
  if (params.page !== undefined) query.append("page", String(params.page));
  if (params.page_size !== undefined)
    query.append("page_size", String(params.page_size));

  const qs = query.toString();
  const path = qs ? `/api/v1/activity-logs?${qs}` : "/api/v1/activity-logs";

  return request<ActivityLogListResponse>(path, {
    method: "GET",
    token,
  });
}

export async function getActivityLog(
  id: number,
  token?: string | null
): Promise<ActivityLog> {
  return request<ActivityLog>(`/api/v1/activity-logs/${id}`, {
    method: "GET",
    token,
  });
}

export interface ActivityLogCleanupRequest {
  older_than_days: number;
  resource_type?: string;
  action_type?: string;
  dry_run: boolean;
}

export interface ActivityLogCleanupResponse {
  deleted_count: number;
  dry_run: boolean;
  message: string;
}

export async function cleanupActivityLogs(
  body: ActivityLogCleanupRequest,
  token?: string | null
): Promise<ActivityLogCleanupResponse> {
  return request<ActivityLogCleanupResponse>("/api/v1/activity-logs/cleanup", {
    method: "POST",
    body,
    token,
  });
}
