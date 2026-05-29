import type { AxiosProgressEvent } from "axios";
import { apiClient, API_V1, unwrap } from "./client";
import type { ApiResponse, ChunkUploadResponse } from "./types";

const BASE = `${API_V1}/file`;

const CHUNK_THRESHOLD = 4 * 1024 * 1024; // 4MB
const CHUNK_SIZE = 1024 * 1024;          // 1MB per chunk

export const fileApi = {
  // Single-shot upload với optional context subfolder.
  // context examples: "products/23", "avatars" → server tổ chức vào subfolder
  uploadFileSingle: (
    file: File,
    onProgress?: (pct: number) => void,
    context?: string,
  ) => {
    const form = new FormData();
    form.append("file", file);
    return unwrap(
      apiClient.post<ApiResponse<ChunkUploadResponse>>(
        `${BASE}/upload-file`,
        form,
        {
          params: context ? { context } : undefined,
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (e: AxiosProgressEvent) => {
            if (onProgress && e.total)
              onProgress(Math.round((e.loaded * 100) / e.total));
          },
        },
      ),
    );
  },

  uploadChunk: (
    chunk: Blob,
    fileName: string,
    chunkNumber: number,
    totalChunks: number,
    context?: string,
  ) => {
    const form = new FormData();
    form.append("chunk", chunk);
    form.append("fileName", fileName);
    form.append("chunkNumber", String(chunkNumber));
    form.append("totalChunks", String(totalChunks));
    if (context) form.append("context", context);
    return unwrap(
      apiClient.post<ApiResponse<ChunkUploadResponse>>(
        `${BASE}/upload-chunk`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } },
      ),
    );
  },

  validateChunk: (fileName: string, chunkNumber: number) =>
    unwrap(
      apiClient.get<ApiResponse<boolean>>(`${BASE}/validate-chunk`, {
        params: { fileName, chunkNumber },
      }),
    ),

  // Smart entry point — tự chọn single-shot hoặc chunked.
  // context: "products/{id}" | "avatars" | undefined (flat)
  upload: async (
    file: File,
    onProgress?: (pct: number) => void,
    context?: string,
  ): Promise<ChunkUploadResponse> => {
    if (file.size <= CHUNK_THRESHOLD) {
      return fileApi.uploadFileSingle(file, onProgress, context);
    }
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    let last: ChunkUploadResponse | null = null;
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      last = await fileApi.uploadChunk(
        file.slice(start, end),
        file.name,
        i + 1,
        totalChunks,
        context,
      );
      onProgress?.(Math.round(((i + 1) / totalChunks) * 100));
    }
    if (!last) throw new Error("Empty file");
    return last;
  },
};
