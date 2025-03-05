/**
 * Extract initials from a name
 * @param name The name to extract initials from
 * @param limit Optional limit on number of characters to return (default 2)
 * @returns Initials (e.g. "John Doe" -> "JD")
 */
export const getInitials = (name: string, limit: number = 2): string => {
    if (!name) return '';

    // Split the name by spaces and get the first letter of each part
    const parts = name.split(/\s+/);
    let initials = '';

    // For single names, return the first two letters
    if (parts.length === 1) {
        return name.substring(0, limit);
    }

    // For multiple names, get first letter of each part
    for (let i = 0; i < Math.min(parts.length, limit); i++) {
        if (parts[i].length > 0) {
            initials += parts[i][0];
        }
    }

    return initials.toUpperCase();
};

/**
 * Truncate text with ellipsis if it exceeds max length
 * @param text The text to truncate
 * @param maxLength Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 */
export const truncateText = (text: string, maxLength: number): string => {
    if (!text || text.length <= maxLength) return text || '';

    return text.substring(0, maxLength - 3) + '...';
}; 