/**
 * Text formatting utilities for menu items, categories, and UI labels
 * Provides consistent, professional formatting across the app
 */

// Common food abbreviations that should remain uppercase
const UPPERCASE_ABBREVIATIONS = [
  'BBQ',
  'KFC',
  'BRT',
  'VIP',
  'QTY',
];

// Food terms that have specific capitalization
const PROPER_NOUNS: Record<string, string> = {
  'biryani': 'Biryani',
  'karahi': 'Karahi',
  'nihari': 'Nihari',
  'haleem': 'Haleem',
  'shawarma': 'Shawarma',
  'zinger': 'Zinger',
  'tikka': 'Tikka',
  'kebab': 'Kebab',
  'samosa': 'Samosa',
  'paratha': 'Paratha',
  'naan': 'Naan',
  'roti': 'Roti',
  'lassi': 'Lassi',
  'chai': 'Chai',
  'pulao': 'Pulao',
  'qorma': 'Qorma',
  'korma': 'Korma',
  'seekh': 'Seekh',
  'chapli': 'Chapli',
  'sajji': 'Sajji',
  'dumba': 'Dumba',
  'mutton': 'Mutton',
  'chicken': 'Chicken',
  'beef': 'Beef',
  'pizza': 'Pizza',
  'burger': 'Burger',
  'fries': 'Fries',
  'sandwich': 'Sandwich',
  'wrap': 'Wrap',
  'roll': 'Roll',
  'pasta': 'Pasta',
  'chinese': 'Chinese',
  'desi': 'Desi',
  'continental': 'Continental',
  'seafood': 'Seafood',
  'dessert': 'Dessert',
  'beverages': 'Beverages',
  'drinks': 'Drinks',
  'breakfast': 'Breakfast',
  'lunch': 'Lunch',
  'dinner': 'Dinner',
  'snacks': 'Snacks',
  'sweets': 'Desserts',
  'bakery': 'Bakery',
  'grocery': 'Grocery',
};

/**
 * Formats a single word with proper capitalization
 */
function formatWord(word: string): string {
  const upperWord = word.toUpperCase();
  
  // Check if it's a known abbreviation
  if (UPPERCASE_ABBREVIATIONS.includes(upperWord)) {
    return upperWord;
  }
  
  // Check if it's a proper noun with specific formatting
  const lowerWord = word.toLowerCase();
  if (PROPER_NOUNS[lowerWord]) {
    return PROPER_NOUNS[lowerWord];
  }
  
  // Default: Title Case (first letter uppercase, rest lowercase)
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * Formats text to Title Case with proper handling of food terms
 * @param text - The text to format
 * @returns Formatted text in Title Case
 */
export function formatMenuText(text: string | null | undefined): string {
  if (!text) return '';
  
  // Split by spaces and format each word
  return text
    .trim()
    .split(/\s+/)
    .map(formatWord)
    .join(' ');
}

/**
 * Formats a category name for display
 * @param category - The category name to format
 * @returns Formatted category name
 */
export function formatCategoryName(category: string | null | undefined): string {
  if (!category) return 'Other';
  return formatMenuText(category);
}

/**
 * Formats a menu item name for display
 * @param name - The menu item name to format
 * @returns Formatted menu item name
 */
export function formatItemName(name: string | null | undefined): string {
  if (!name) return '';
  return formatMenuText(name);
}

/**
 * Formats price for display in PKR
 * @param price - The price in integer (no decimal)
 * @returns Formatted price string
 */
export function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined) return 'Rs. 0';
  return `Rs. ${price.toLocaleString()}`;
}
