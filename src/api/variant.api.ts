import { apiClient, API_V1, unwrap } from "./client";
import type { ApiResponse } from "./types";

export interface AttributeValueDto {
  id: number; attributeId: number; attributeName: string;
  value: string; displayOrder: number;
}

export interface ProductAttributeDto {
  id: number; name: string; slug: string; isActive: boolean;
  values: AttributeValueDto[];
}

export interface ProductVariantDto {
  id: number; productId: number; sku: string;
  price: number; compareAtPrice?: number; costPrice?: number;
  stockQuantity: number; barcode?: string;
  isActive: boolean; createdAt: string;
  attributes: AttributeValueDto[];
  attributeLabel: string;
}

export interface VariantPreviewDto {
  sku: string;
  attributes: AttributeValueDto[];
  attributeLabel: string;
  price: number;
  stockQuantity: number;
  attributeValueIds: number[];
}

export interface GenerateMatrixDto {
  attributeGroups: number[][];
  skuPrefix?: string;
  defaultPrice: number;
  defaultStock: number;
}

export interface BulkSaveVariantsDto {
  variants: Array<{
    sku: string; price: number; compareAtPrice?: number;
    costPrice?: number; stockQuantity: number;
    barcode?: string; isActive: boolean;
    attributeValueIds: number[];
  }>;
  clearExisting?: boolean;
}

export interface UpdateVariantDto {
  sku?: string; price?: number; compareAtPrice?: number;
  costPrice?: number; stockQuantity?: number;
  barcode?: string; isActive?: boolean;
}

const BASE = API_V1;

export const variantApi = {
  // Attributes
  getAttributes: () =>
    unwrap(apiClient.get<ApiResponse<ProductAttributeDto[]>>(`${BASE}/product-attributes`)),

  createAttribute: (body: { name: string; slug: string; isActive?: boolean }) =>
    unwrap(apiClient.post<ApiResponse<ProductAttributeDto>>(`${BASE}/product-attributes`, body)),

  addValue: (attributeId: number, body: { value: string; displayOrder?: number }) =>
    unwrap(apiClient.post<ApiResponse<AttributeValueDto>>(`${BASE}/product-attributes/${attributeId}/values`, body)),

  deleteValue: (valueId: number) =>
    unwrap(apiClient.delete<ApiResponse<number>>(`${BASE}/product-attributes/values/${valueId}`)),

  // Variants
  getByProduct: (productId: number) =>
    unwrap(apiClient.get<ApiResponse<ProductVariantDto[]>>(`${BASE}/products/${productId}/variants`)),

  previewMatrix: (productId: number, dto: GenerateMatrixDto) =>
    unwrap(apiClient.post<ApiResponse<VariantPreviewDto[]>>(`${BASE}/products/${productId}/variants/preview`, dto)),

  bulkSave: (productId: number, dto: BulkSaveVariantsDto) =>
    unwrap(apiClient.post<ApiResponse<ProductVariantDto[]>>(`${BASE}/products/${productId}/variants/bulk`, dto)),

  updateVariant: (id: number, dto: UpdateVariantDto) =>
    unwrap(apiClient.put<ApiResponse<ProductVariantDto>>(`${BASE}/variants/${id}`, dto)),

  deleteVariant: (id: number) =>
    unwrap(apiClient.delete<ApiResponse<number>>(`${BASE}/variants/${id}`)),
};
