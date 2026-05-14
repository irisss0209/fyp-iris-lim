export function validatePassword(password: string): string | null {
  const missing: string[] = [];
  if (password.length < 8) missing.push('at least 8 characters');
  if (!/[A-Z]/.test(password)) missing.push('one uppercase letter');
  if (!/[a-z]/.test(password)) missing.push('one lowercase letter');
  if (!/[0-9]/.test(password)) missing.push('one number');
  if (!/[!@#$%^&*(),.?":{}|<>_~-]/.test(password)) missing.push('one special character');
  return missing.length > 0 ? `Password must contain: ${missing.join(', ')}.` : null;
}
