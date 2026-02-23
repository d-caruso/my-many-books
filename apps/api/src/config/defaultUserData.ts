// ================================================================
// src/config/defaultUserData.ts
// Default seed data for new user onboarding
// ================================================================

export interface DefaultAuthor {
  name: string;
  surname: string;
  nationality: string;
}

export interface DefaultCategory {
  name: string;
}

export const DEFAULT_AUTHORS: DefaultAuthor[] = [
  { name: 'William', surname: 'Shakespeare', nationality: 'British' },
  { name: 'Jane', surname: 'Austen', nationality: 'British' },
  { name: 'Charles', surname: 'Dickens', nationality: 'British' },
  { name: 'Mark', surname: 'Twain', nationality: 'American' },
  { name: 'Ernest', surname: 'Hemingway', nationality: 'American' },
  { name: 'Gabriel', surname: 'García Márquez', nationality: 'Colombian' },
  { name: 'Jorge Luis', surname: 'Borges', nationality: 'Argentine' },
  { name: 'Fyodor', surname: 'Dostoevsky', nationality: 'Russian' },
  { name: 'Leo', surname: 'Tolstoy', nationality: 'Russian' },
  { name: 'Franz', surname: 'Kafka', nationality: 'Czech' },
  { name: 'Virginia', surname: 'Woolf', nationality: 'British' },
  { name: 'George', surname: 'Orwell', nationality: 'British' },
  { name: 'J.R.R.', surname: 'Tolkien', nationality: 'British' },
  { name: 'Agatha', surname: 'Christie', nationality: 'British' },
  { name: 'Isaac', surname: 'Asimov', nationality: 'American' },
  { name: 'Haruki', surname: 'Murakami', nationality: 'Japanese' },
  { name: 'Italo', surname: 'Calvino', nationality: 'Italian' },
  { name: 'Umberto', surname: 'Eco', nationality: 'Italian' },
  { name: 'Stephen', surname: 'King', nationality: 'American' },
  { name: 'Isabel', surname: 'Allende', nationality: 'Chilean' },
];

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: 'Fiction' },
  { name: 'Non-Fiction' },
  { name: 'Science Fiction' },
  { name: 'Fantasy' },
  { name: 'Mystery & Thriller' },
  { name: 'Romance' },
  { name: 'Historical Fiction' },
  { name: 'Biography & Memoir' },
  { name: 'Science & Technology' },
  { name: 'Horror' },
];
