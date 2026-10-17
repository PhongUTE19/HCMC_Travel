import { UI_LABELS } from '../constants';

/**
 * Formats section display title based on chunk or source metadata.
 *
 * @param {{ title?: string, sectionNumber?: number | string, sectionTitle?: string }} item
 * @returns {string} Formatted section title
 */
export function formatSectionTitle(item) {
  if (!item) return UI_LABELS.ANSWER_SECTION.DEFAULT_SECTION_TITLE;
  if (item.title) return item.title;
  if (item.sectionNumber) {
    return `${UI_LABELS.ANSWER_SECTION.SECTION_PREFIX} ${item.sectionNumber}: ${item.sectionTitle || ''}`;
  }
  return UI_LABELS.ANSWER_SECTION.DEFAULT_SECTION_TITLE;
}

/**
 * Formats a similarity score to a fixed precision.
 *
 * @param {number|string|undefined|null} score - Similarity score
 * @param {number} [precision=4] - Decimal places
 * @returns {string} Formatted score
 */
export function formatScore(score, precision = 4) {
  if (score === undefined || score === null) return '';
  return typeof score === 'number' ? score.toFixed(precision) : String(score);
}

/**
 * Formats bytes to KB with specified decimal precision.
 *
 * @param {number} bytes - File size in bytes
 * @param {number} [precision=1] - Decimal places
 * @returns {string} Formatted size in KB
 */
export function formatFileSize(bytes, precision = 1) {
  if (typeof bytes !== 'number' || isNaN(bytes)) return '0.0';
  return (bytes / 1024).toFixed(precision);
}
