/**
 * Format a phone number to a more readable format
 * @param phoneNumber The phone number to format
 * @returns Formatted phone number (e.g. (123) 456-7890)
 */
export const formatPhoneNumber = (phoneNumber: string): string => {
    if (!phoneNumber) return '';

    // Strip all non-numeric characters
    const cleaned = phoneNumber.replace(/\D/g, '');

    // Format based on length
    if (cleaned.length === 10) {
        // US format (XXX) XXX-XXXX
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
        // US with country code: 1 (XXX) XXX-XXXX
        return `1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7, 11)}`;
    }

    // If not a standard format, just add spaces for readability
    // for international numbers
    if (cleaned.length > 10) {
        // Try to format international numbers in a readable way
        // For example: +XX XXX XXX XXXX
        if (cleaned.startsWith('1')) {
            // US/Canada
            return `+${cleaned.slice(0, 1)} ${cleaned.slice(1, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
        }

        // Generic international format
        return `+${cleaned}`;
    }

    // For shorter numbers, just return as is
    return phoneNumber;
};

/**
 * Normalize a phone number by removing all non-numeric characters
 * @param phoneNumber The phone number to normalize
 * @returns Normalized phone number (only digits)
 */
export const normalizePhoneNumber = (phoneNumber: string): string => {
    if (!phoneNumber) return '';

    // Remove all non-numeric characters except leading +
    let normalized = phoneNumber.replace(/[^\d+]/g, '');

    // If it starts with +, keep it, otherwise remove any remaining non-digits
    if (normalized.startsWith('+')) {
        return normalized;
    } else {
        return normalized.replace(/\D/g, '');
    }
}; 