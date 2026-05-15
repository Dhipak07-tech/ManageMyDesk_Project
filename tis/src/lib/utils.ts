import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: any): string {
  if (!date) return "—";
  if (date?.seconds) {
    return new Date(date.seconds * 1000).toLocaleDateString();
  }
  if (typeof date === "string") {
    return new Date(date).toLocaleDateString();
  }
  if (date instanceof Date) {
    return date.toLocaleDateString();
  }
  return "—";
}
