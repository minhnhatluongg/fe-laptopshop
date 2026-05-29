import { apiClient, API_V1, unwrap } from "./client";
import type { ApiResponse, Role } from "./types";

const BASE = `${API_V1}/roles`;

// All endpoints require Admin role.
export const roleApi = {
  getAll: () => unwrap(apiClient.get<ApiResponse<Role[]>>(`${BASE}/GetAllRoles`)),

  getById: (id: number) =>
    unwrap(apiClient.get<ApiResponse<Role>>(`${BASE}/GetRoleById/${id}`)),

  create: (body: Omit<Role, "id">) =>
    unwrap(apiClient.post<ApiResponse<Role>>(`${BASE}/CreateRole`, body)),

  update: (id: number, body: Partial<Role>) =>
    unwrap(apiClient.put<ApiResponse<Role>>(`${BASE}/UpdateRole/${id}`, body)),

  delete: (id: number) =>
    unwrap(apiClient.delete<ApiResponse<void>>(`${BASE}/DeleteRole/${id}`)),
};
