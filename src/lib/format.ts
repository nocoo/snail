export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
export function formatDuration(value: number | null) {
  if (!value || !Number.isFinite(value)) return "—";
  const seconds = Math.floor(value);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
export function formatDate(value: number) {
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" }).format(value);
}
