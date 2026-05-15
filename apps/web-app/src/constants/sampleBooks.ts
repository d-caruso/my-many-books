export const SAMPLE_PREVIEW_DISMISSED = 'SAMPLE_PREVIEW_DISMISSED';

export interface SampleBook {
  id: string;
  title: string;
  authorName: string;
  status: 'reading' | 'paused' | 'finished';
}

export const SAMPLE_BOOKS: SampleBook[] = [
  { id: 'sample-1', title: '1984',                          authorName: 'George Orwell',         status: 'finished' },
  { id: 'sample-2', title: 'Pride and Prejudice',           authorName: 'Jane Austen',            status: 'finished' },
  { id: 'sample-3', title: 'One Hundred Years of Solitude', authorName: 'Gabriel García Márquez', status: 'reading'  },
  { id: 'sample-4', title: 'The Old Man and the Sea',       authorName: 'Ernest Hemingway',       status: 'paused'   },
  { id: 'sample-5', title: 'Norwegian Wood',                authorName: 'Haruki Murakami',        status: 'reading'  },
];
