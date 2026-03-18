export const HOOK_PAYLOAD_SOURCES = {
  MOBILE_AUTH_SERVICE: 'mobile_auth_service',
  SCANNER_SCREEN: 'scanner_screen',
  SEARCH_SCREEN: 'search_screen',
  USE_BARCODE_SCANNER_REQUEST_PERMISSION: 'useBarcodeScanner.requestPermission',
  USE_BOOK_SEARCH_SEARCH_BOOKS: 'useBookSearch.searchBooks',
  USE_BOOK_SEARCH_SEARCH_BOOKS_ERROR: 'useBookSearch_searchBooks',
  USE_BOOK_SEARCH_SEARCH_BY_ISBN_ERROR: 'useBookSearch_searchByISBN',
} as const;

export const HOOK_PAYLOAD_PROVIDERS = {
  PASSWORD: 'password',
  GOOGLE: 'google',
} as const;

export const HOOK_PAYLOAD_ERRORS = {
  SESSION_REFRESH_FAILED: 'Session refresh failed',
} as const;

export const HOOK_PAYLOAD_DESTINATIONS = {
  SEARCH: 'search',
  BOOK_ADD: 'book_add',
} as const;

export const HOOK_PAYLOAD_OPERATIONS = {
  SEARCH: 'search',
  ISBN_SEARCH: 'isbn_search',
} as const;

export const HOOK_PAYLOAD_SELECTION_CONTEXTS = {
  ISBN: 'isbn',
  QUERY: 'query',
} as const;
