import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// -----------------------------------------------------------------------------
// Safe String Utilities
// -----------------------------------------------------------------------------

/**
 * Safely converts a value to lowercase string.
 * Returns empty string if value is null/undefined.
 */
export function safeLower(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).toLowerCase();
}

/**
 * Safely converts a value to uppercase string.
 * Returns empty string if value is null/undefined.
 */
export function safeUpper(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).toUpperCase();
}

/**
 * Safely checks if a string includes a substring.
 * Returns false if value is null/undefined.
 */
export function safeIncludes(value: unknown, search: string): boolean {
  if (value === null || value === undefined) return false;
  return String(value).includes(search);
}

// -----------------------------------------------------------------------------
// Safe Array Utilities
// -----------------------------------------------------------------------------

/**
 * Safely returns an array from a potential null/undefined value.
 * Returns empty array if value is null/undefined/not an array.
 */
export function safeArray<T>(value: T[] | null | undefined): T[] {
  if (!Array.isArray(value)) return [];
  return value;
}

/**
 * Safely maps over an array.
 * Returns empty array if value is null/undefined.
 */
export function safeMap<T, U>(
  array: T[] | null | undefined,
  callback: (item: T, index: number) => U
): U[] {
  if (!Array.isArray(array)) return [];
  return array.map(callback);
}

/**
 * Safely filters an array.
 * Returns empty array if value is null/undefined.
 */
export function safeFilter<T>(
  array: T[] | null | undefined,
  predicate: (item: T, index: number) => boolean
): T[] {
  if (!Array.isArray(array)) return [];
  return array.filter(predicate);
}

/**
 * Safely gets length of array or string.
 * Returns 0 if null/undefined.
 */
export function safeLength(value: unknown[] | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return value.length;
}
