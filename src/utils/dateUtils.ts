export type DateFrequency = 'weekly' | 'biweekly' | 'monthly';

/**
 * Calculates the next due date based on the given base date and recurrence frequency.
 *
 * @param currentDate - The base date from which to advance
 * @param frequency - The repetition interval ('weekly' | 'biweekly' | 'monthly')
 * @returns A new Date object advanced by the appropriate interval
 */
export function calculateNextDueDate(
  currentDate: Date,
  frequency: DateFrequency
): Date {
  const nextDate = new Date(currentDate.getTime());
  switch (frequency) {
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'biweekly':
      nextDate.setDate(nextDate.getDate() + 14);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
  }
  return nextDate;
}

/**
 * Formats a Date object as 'DD/MM/YYYY'.
 *
 * @param date - The Date to format
 * @returns Formatted string in 'DD/MM/YYYY' format
 */
export function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Calculates the difference in calendar days between today and a target due date.
 *
 * @param dueDate - Target date to evaluate
 * @returns Number of days until due (positive: future, 0: today, negative: past)
 */
export function getDaysUntilDue(dueDate: Date): number {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dueDayStart = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()).getTime();
  const diffMs = dueDayStart - todayStart;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Checks if a given due date has already passed.
 *
 * @param dueDate - Date to check
 * @returns True if the due date is in the past compared to today
 */
export function isOverdue(dueDate: Date): boolean {
  return getDaysUntilDue(dueDate) < 0;
}

/**
 * Formats a date relative to today in French human-readable format.
 * Returns 'Aujourd\'hui', 'Demain', 'Dans X jours', 'Il y a X jours',
 * or the standard formatted date 'DD/MM/YYYY' for dates beyond 30 days.
 *
 * @param date - Date to format
 * @returns Localized relative date string
 */
export function formatRelativeDate(date: Date): string {
  const days = getDaysUntilDue(date);

  if (days === 0) {
    return "Aujourd'hui";
  }
  if (days === 1) {
    return 'Demain';
  }
  if (days > 1 && days <= 30) {
    return `Dans ${days} jours`;
  }
  if (days < 0 && days >= -30) {
    const absDays = Math.abs(days);
    return `Il y a ${absDays} jour${absDays > 1 ? 's' : ''}`;
  }

  return formatDate(date);
}
