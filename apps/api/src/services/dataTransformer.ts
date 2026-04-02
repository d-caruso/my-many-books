// ================================================================
// src/services/dataTransformer.ts
// ================================================================

import { getLogger } from '@my-many-books/shared-logging';
import { OpenLibraryBook, OpenLibrarySubjectEntry } from '@/types/openLibrary';
import {
  TransformedBookData,
  TransformedAuthorData,
  TransformedCategoryData,
} from '@/types/bookData';
import { normalizeIsbn } from '@/utils/isbn';

export class DataTransformer {
  /**
   * Transform Open Library book data to our internal format
   */
  static transformBook(olBook: OpenLibraryBook, isbn: string): TransformedBookData {
    const normalizedIsbn = normalizeIsbn(isbn);
    if (!normalizedIsbn) {
      throw new Error(`Invalid ISBN provided for transformation: ${isbn}`);
    }

    return {
      isbnCode: normalizedIsbn,
      title: DataTransformer.extractTitle(olBook),
      authors: DataTransformer.extractAuthors(olBook),
      categories: DataTransformer.extractCategories(olBook),
      editionNumber: DataTransformer.extractEditionNumber(olBook),
      editionDate: DataTransformer.extractEditionDate(olBook),
      // Not used by the client — kept in TransformedBookData for future use:
      // subtitle: olBook.subtitle,
      // publishers: olBook.publishers,
      // pages: olBook.number_of_pages,
      // language: DataTransformer.extractLanguage(olBook),
      // coverUrls: DataTransformer.extractCoverUrls(olBook),
      // description: olBook.notes (OL notes are internal catalog metadata, not user-facing)
      // physicalFormat: olBook.physical_format,
      // weight: olBook.weight,
      // dimensions: olBook.physical_dimensions,
    };
  }

  private static extractTitle(olBook: OpenLibraryBook): string {
    return olBook.title?.trim() || 'Unknown Title';
  }

  private static extractAuthors(olBook: OpenLibraryBook): TransformedAuthorData[] {
    if (!olBook.authors || olBook.authors.length === 0) {
      return [];
    }

    return olBook.authors.flatMap(author => {
      const authorName = author.name.trim();
      const parsed = DataTransformer.parseAuthorName(authorName);
      if (!parsed) return [];
      return [{ name: parsed.name, surname: parsed.surname, nationality: undefined }];
    });
  }

  private static parseAuthorName(authorName: string): { name: string; surname: string } | null {
    const parts = authorName.split(' ').filter(part => part.length > 0);

    if (parts.length === 0) {
      return null;
    }

    if (parts.length === 1) {
      return { name: parts[0]!, surname: '' };
    }

    // Handle "Last, First" format
    if (authorName.includes(',')) {
      const splitParts = authorName.split(',');
      const lastName = splitParts[0];
      const firstParts = splitParts.slice(1);
      const firstName = firstParts.join(' ').trim();
      return {
        name: firstName || lastName!.trim(),
        surname: firstName ? lastName!.trim() : '',
      };
    }

    // Handle "First Last" or "First Middle Last" format
    const surname = parts[parts.length - 1]!;
    const name = parts.slice(0, -1).join(' ');

    return { name, surname };
  }

  private static extractCategories(olBook: OpenLibraryBook): TransformedCategoryData[] {
    const categories: TransformedCategoryData[] = [
      ...DataTransformer.extractCategoriesByType(olBook.subjects, 'subject'),
      ...DataTransformer.extractCategoriesByType(olBook.subject_places, 'topic'),
      ...DataTransformer.extractCategoriesByType(olBook.subject_times, 'topic'),
    ];

    // Remove duplicates and limit to reasonable number
    const uniqueCategories = DataTransformer.deduplicateCategories(categories);
    return uniqueCategories.slice(0, 10); // Limit to 10 categories max
  }

  private static extractCategoriesByType(
    entries: OpenLibrarySubjectEntry[] | undefined,
    type: 'subject' | 'topic'
  ): TransformedCategoryData[] {
    if (!entries || entries.length === 0) {
      return [];
    }

    return entries
      .map(entry => DataTransformer.normalizeSubjectEntry(entry))
      .filter(entry => entry.length > 0)
      .map(entry => ({
        name: DataTransformer.normalizeCategory(entry),
        type,
      }));
  }

  private static normalizeSubjectEntry(entry: OpenLibrarySubjectEntry): string {
    const value = typeof entry === 'string' ? entry : entry.name;
    return value.trim();
  }

  private static normalizeCategory(category: string): string {
    return category
      .trim()
      .replace(/^\w/, c => c.toUpperCase()) // Capitalize first letter
      .replace(/\s+/g, ' '); // Normalize whitespace
  }

  private static deduplicateCategories(
    categories: TransformedCategoryData[]
  ): TransformedCategoryData[] {
    const seen = new Set<string>();
    return categories.filter(category => {
      const key = `${category.name.toLowerCase()}-${category.type}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private static extractEditionNumber(olBook: OpenLibraryBook): number | undefined {
    // Try to extract edition number from title or other fields
    const title = olBook.title || '';
    const editionMatch = title.match(/(\d+)(?:st|nd|rd|th)?\s+edition/i);
    if (editionMatch && editionMatch[1]) {
      return parseInt(editionMatch[1], 10);
    }

    return undefined;
  }

  private static extractEditionDate(olBook: OpenLibraryBook): string | undefined {
    if (!olBook.publish_date) {
      return undefined;
    }

    try {
      const dateStr = olBook.publish_date.trim();

      // Try ISO full date (YYYY-MM-DD)
      const isoFullMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (isoFullMatch) {
        return isoFullMatch[0].slice(0, 10);
      }

      // Try ISO month (YYYY-MM)
      const isoMonthMatch = dateStr.match(/^(\d{4})-(\d{2})$/);
      if (isoMonthMatch) {
        return isoMonthMatch[0];
      }

      // Try "Month DD, YYYY" or "Month YYYY" formats
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        // Check if the original string had a day component
        const hasDayNumber = /\b\d{1,2}[,\s]/.test(dateStr);
        if (hasDayNumber) {
          const y = parsed.getFullYear();
          const m = String(parsed.getMonth() + 1).padStart(2, '0');
          const d = String(parsed.getDate()).padStart(2, '0');
          return `${y}-${m}-${d}`;
        }
        // Month + Year (e.g. "January 1979")
        const hasMonthName = /[a-zA-Z]/.test(dateStr);
        if (hasMonthName) {
          const y = parsed.getFullYear();
          const m = String(parsed.getMonth() + 1).padStart(2, '0');
          return `${y}-${m}`;
        }
      }

      // Fallback: extract year from any format (e.g. "c1979", "1979")
      const yearMatch = dateStr.match(/(\d{4})/);
      if (yearMatch && yearMatch[1]) {
        return yearMatch[1];
      }

      return undefined;
    } catch (error) {
      getLogger().warn(
        {
          err: error instanceof Error ? error : new Error(String(error)),
          publishDate: olBook.publish_date,
        },
        'Failed to parse edition date'
      );
      return undefined;
    }
  }

  private static extractLanguage(olBook: OpenLibraryBook): string | undefined {
    if (!olBook.languages || olBook.languages.length === 0) {
      return undefined;
    }

    // Open Library language format: { key: "/languages/eng" }
    const language = olBook.languages[0];
    if (!language) {
      return undefined;
    }

    const langKey = language.key;
    const langCode = langKey.split('/').pop();

    // Convert common language codes to readable names
    const languageMap: Record<string, string> = {
      eng: 'English',
      spa: 'Spanish',
      fre: 'French',
      ger: 'German',
      ita: 'Italian',
      por: 'Portuguese',
      rus: 'Russian',
      jpn: 'Japanese',
      chi: 'Chinese',
      ara: 'Arabic',
    };

    return langCode ? languageMap[langCode] || langCode : undefined;
  }

  private static extractCoverUrls(
    olBook: OpenLibraryBook
  ):
    | { small?: string | undefined; medium?: string | undefined; large?: string | undefined }
    | undefined {
    if (!olBook.cover) {
      return undefined;
    }

    return {
      small: olBook.cover.small || undefined,
      medium: olBook.cover.medium || undefined,
      large: olBook.cover.large || undefined,
    };
  }
}
