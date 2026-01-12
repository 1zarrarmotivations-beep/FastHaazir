/**
 * Phone number utility functions for Fast Haazir
 * 
 * CRITICAL: For database matching, always use normalizePhoneDigits() which returns digits only.
 * The database stores phone numbers as digits (e.g., 923110111419) without the + prefix.
 */

/**
 * Normalize phone number to digits only format: 923XXXXXXXXX
 * This MUST be used for all database queries and comparisons.
 * Matches the database function: normalize_pk_phone_digits
 */
export const normalizePhoneDigits = (phone: string): string => {
  if (!phone) return "";

  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, "");

  if (!digits) return "";

  // Handle 0092 prefix
  if (digits.startsWith("0092")) {
    digits = "92" + digits.slice(4);
  }

  // Already starts with 92
  if (digits.startsWith("92")) {
    return digits;
  }

  // Starts with 0 (local format)
  if (digits.startsWith("0")) {
    return "92" + digits.slice(1);
  }

  // 10 digit number (without country code)
  if (digits.length === 10) {
    return "92" + digits;
  }

  return digits;
};

/**
 * Normalize phone number to E.164 format for Firebase: +923XXXXXXXXX
 * Firebase requires the + prefix for phone authentication.
 */
export const normalizePhoneNumber = (phone: string): string => {
  const digits = normalizePhoneDigits(phone);
  if (!digits) return "";
  return `+${digits}`;
};

/**
 * Format phone number for display (local format)
 * @returns 03XX-XXXXXXX
 */
export const formatPhoneDisplay = (phone: string): string => {
  const digits = normalizePhoneDigits(phone);
  if (!digits) return "";

  // 92XXXXXXXXXX -> 0XXXXXXXXXX
  const localDigits = digits.startsWith("92") ? `0${digits.slice(2)}` : digits;

  if (localDigits.length <= 4) return localDigits;
  return `${localDigits.slice(0, 4)}-${localDigits.slice(4)}`;
};

/**
 * Validate if phone number is valid Pakistan mobile number
 */
export const isValidPakistaniMobile = (phone: string): boolean => {
  const digits = normalizePhoneDigits(phone);
  return /^923\d{9}$/.test(digits);
};
