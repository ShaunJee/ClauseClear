import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Standard shadcn / tailwind class merging utility
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
