export interface Category {
  id: string;
  name: string;
  parentId: string | null;
}
export interface Tag {
  id: string;
  name: string;
}
export interface Asset {
  id: string;
  title: string;
  description: string;
  favorite: boolean;
  categoryId: string | null;
  sourceId: string | null;
  sourceUrl: string | null;
  mediaId: string | null;
  duration: number | null;
  width: number | null;
  height: number | null;
  createdAt: number;
  updatedAt: number;
  size: number;
  mime: string;
  sha256: string;
  hasPoster: boolean;
  tags: Tag[];
}
export interface AssetPage {
  items: Asset[];
  total: number;
  page: number;
  limit: number;
}
export interface Device {
  id: string;
  name: string;
  scopes: string[];
  expiresAt: number;
  revokedAt: number | null;
  lastSeenAt: number | null;
  createdAt: number;
  checkpoint: string | null;
}
export interface Job {
  id: string;
  sourceUrl: string;
  status: "queued" | "claimed" | "ready" | "failed" | "cancelled";
  assetId: string | null;
  errorCode: string | null;
  createdAt: number;
  updatedAt: number;
}
export interface UploadSession {
  id?: string;
  status?: string;
  assetId?: string;
  partSize?: number;
  resumed?: boolean;
  deduplicated?: boolean;
}
export interface UploadProgress {
  id: string;
  name: string;
  percent: number;
  phase: "hashing" | "uploading" | "verifying" | "ready" | "failed" | "paused";
  error?: string;
  file: File;
}
