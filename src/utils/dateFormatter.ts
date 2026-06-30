/**
 * Formats a date to dd-mm-yyyy format
 */
export const formatDate = (date: string | Date | undefined | null): string => {
  if (!date) return '-';
  
  const d = new Date(date);
  
  if (isNaN(d.getTime())) {
    return '-';
  }
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return `${day}-${month}-${year}`;
};

/**
 * Formats a date-only value (e.g. a DOB) to dd-mm-yyyy without applying any
 * timezone conversion. Parsing date-only strings through `new Date(...)` treats
 * them as UTC midnight, which can shift the day in negative-offset timezones, so
 * we parse the string parts directly.
 */
export const formatDisplayDate = (
  value: string | Date | undefined | null,
): string => {
  if (!value) return '-';

  const raw = String(value).trim();
  const datePart = raw.includes('T') ? raw.split('T')[0] : raw;
  const parts = datePart.split('-');

  if (parts.length === 3) {
    const [y, m, d] = parts;
    if (y.length === 4 && m.length >= 1 && d.length >= 1) {
      return `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
    }
  }

  return formatDate(value);
};
