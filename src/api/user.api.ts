import { apiClient, API_V1, unwrap } from "./client";
import type {
  ApiResponse,
  PagedResult,
  PaginationQuery,
  User,
} from "./types";

const BASE = `${API_V1}/users`;

// All endpoints require Admin role.
export const userApi = {
  getAll: () =>
    unwrap(apiClient.get<ApiResponse<User[]>>(`${BASE}/GetAllUsers`)),

  getById: (id: number) =>
    unwrap(apiClient.get<ApiResponse<User>>(`${BASE}/GetUserById/${id}`)),

  getByEmail: (email: string) =>
    unwrap(
      apiClient.get<ApiResponse<User>>(`${BASE}/GetUserByEmail`, {
        params: { email },
      }),
    ),

  getPaged: (query: PaginationQuery = {}) =>
    unwrap(
      apiClient.get<ApiResponse<PagedResult<User>>>(`${BASE}/GetPagedUsers`, {
        params: query,
      }),
    ),

  checkEmailExists: (email: string, excludeId?: number) =>
    unwrap(
      apiClient.get<ApiResponse<boolean>>(`${BASE}/CheckEmailExists`, {
        params: { email, excludeId },
      }),
    ),

  create: (body: Partial<User> & { password: string }) =>
    unwrap(apiClient.post<ApiResponse<User>>(`${BASE}/CreateUser`, body)),

  update: (id: number, body: Partial<User>) =>
    unwrap(apiClient.put<ApiResponse<User>>(`${BASE}/UpdateUser/${id}`, body)),

  delete: (id: number) =>
    unwrap(apiClient.delete<ApiResponse<void>>(`${BASE}/DeleteUser/${id}`)),

  changeStatus: (id: number, isActive: boolean) =>
    unwrap(
      apiClient.put<ApiResponse<User>>(`${BASE}/ChangeUserStatus/${id}`, {
        isActive,
      }),
    ),
};
