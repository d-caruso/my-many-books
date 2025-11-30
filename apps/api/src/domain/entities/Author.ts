// ================================================================
// domain/entities/Author.ts
// Domain-level representation of an author (DB-agnostic)
// ================================================================

export interface AuthorBookSummary {
  id: number;
  title: string;
}

export interface AuthorEntity {
  id: number;
  name: string;
  surname: string;
  nationality?: string | null;
  userId: number;
  creationDate: Date;
  updateDate?: Date;
  books?: AuthorBookSummary[];
}
