export function formatTimeRemaining(deadline: Date, now: Date = new Date()): string {
  const ms = deadline.getTime() - now.getTime();
  if (ms <= 0) return "Deadline passed";
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days} day${days === 1 ? "" : "s"} ${hours} hour${hours === 1 ? "" : "s"}`;
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours} hour${hours === 1 ? "" : "s"} ${minutes} min`;
  return `${minutes} min`;
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const ms = now.getTime() - date.getTime();
  const seconds = Math.round(ms / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);
  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return formatDate(date);
}

export function bytesToSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
