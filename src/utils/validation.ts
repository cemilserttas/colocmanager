export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates an email address.
 *
 * @param email - The email string to validate
 * @returns Object indicating validity and optional error message
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || email.trim().length === 0) {
    return { valid: false, error: "L'adresse email est requise." };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return { valid: false, error: "Format d'adresse email invalide." };
  }
  return { valid: true };
}

/**
 * Validates a user password.
 * Must be at least 6 characters in length.
 *
 * @param password - The password string to validate
 * @returns Object indicating validity and optional error message
 */
export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { valid: false, error: 'Le mot de passe est requis.' };
  }
  if (password.length < 6) {
    return { valid: false, error: 'Le mot de passe doit comporter au moins 6 caractères.' };
  }
  return { valid: true };
}

/**
 * Validates a user display name.
 * Must be between 2 and 50 characters in length.
 *
 * @param name - The display name to validate
 * @returns Object indicating validity and optional error message
 */
export function validateDisplayName(name: string): ValidationResult {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: "Le nom d'affichage est requis." };
  }
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { valid: false, error: "Le nom d'affichage doit comporter au moins 2 caractères." };
  }
  if (trimmed.length > 50) {
    return { valid: false, error: "Le nom d'affichage ne peut pas dépasser 50 caractères." };
  }
  return { valid: true };
}

/**
 * Validates a product name.
 * Must be between 2 and 50 characters in length.
 *
 * @param name - The product name to validate
 * @returns Object indicating validity and optional error message
 */
export function validateProductName(name: string): ValidationResult {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Le nom du produit est requis.' };
  }
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { valid: false, error: 'Le nom du produit doit comporter au moins 2 caractères.' };
  }
  if (trimmed.length > 50) {
    return { valid: false, error: 'Le nom du produit ne peut pas dépasser 50 caractères.' };
  }
  return { valid: true };
}

/**
 * Validates a group/colocation name.
 * Must be between 2 and 50 characters in length.
 *
 * @param name - The group name to validate
 * @returns Object indicating validity and optional error message
 */
export function validateGroupName(name: string): ValidationResult {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Le nom de la colocation est requis.' };
  }
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { valid: false, error: 'Le nom de la colocation doit comporter au moins 2 caractères.' };
  }
  if (trimmed.length > 50) {
    return { valid: false, error: 'Le nom de la colocation ne peut pas dépasser 50 caractères.' };
  }
  return { valid: true };
}

/**
 * Generates an 8-character formatted alphanumeric invite code (e.g. 'ABC-1234').
 *
 * @returns Formatted invite code string
 */
export function generateInviteCode(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';

  let code = '';
  for (let i = 0; i < 3; i++) {
    code += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  code += '-';
  for (let i = 0; i < 4; i++) {
    code += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  return code;
}
