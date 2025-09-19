import { Book } from '@/types';

export type RootStackParamList = {
  '(tabs)': undefined;
  auth: undefined;
  'book/[id]': { id: string };
  'book/edit/[id]': { id: string };
  'book/add': { isbn?: string; bookData?: string };
  scanner: undefined;
};

export type TabParamList = {
  index: undefined;
  search: undefined;
  scanner: undefined;
  profile: undefined;
};

export type BookStackParamList = {
  details: { book: Book };
  edit: { book: Book };
  add: { isbn?: string; bookData?: string };
};