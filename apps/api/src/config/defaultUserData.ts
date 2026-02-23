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
  translationKey: string;
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
  { name: 'Fiction', translationKey: 'categories.fiction' },
  { name: 'Non-Fiction', translationKey: 'categories.non_fiction' },
  { name: 'Science Fiction', translationKey: 'categories.science_fiction' },
  { name: 'Fantasy', translationKey: 'categories.fantasy' },
  { name: 'Mystery & Thriller', translationKey: 'categories.mystery_thriller' },
  { name: 'Romance', translationKey: 'categories.romance' },
  { name: 'Historical Fiction', translationKey: 'categories.historical_fiction' },
  { name: 'Biography & Memoir', translationKey: 'categories.biography_memoir' },
  { name: 'Science & Technology', translationKey: 'categories.science_technology' },
  { name: 'Horror', translationKey: 'categories.horror' },
  { name: 'Young Adult', translationKey: 'categories.young_adult' },
  { name: "Children's Books", translationKey: 'categories.childrens_books' },
  { name: 'Poetry', translationKey: 'categories.poetry' },
  { name: 'Drama', translationKey: 'categories.drama' },
  { name: 'Philosophy', translationKey: 'categories.philosophy' },
  { name: 'Self-Help', translationKey: 'categories.self_help' },
  { name: 'Business & Economics', translationKey: 'categories.business_economics' },
  { name: 'History', translationKey: 'categories.history' },
  { name: 'Politics & Current Affairs', translationKey: 'categories.politics_current_affairs' },
  { name: 'Travel', translationKey: 'categories.travel' },
  { name: 'Graphic Novels & Comics', translationKey: 'categories.graphic_novels_comics' },
  { name: 'Crime', translationKey: 'categories.crime' },
  { name: 'Classics', translationKey: 'categories.classics' },
  { name: 'Literary Fiction', translationKey: 'categories.literary_fiction' },
  { name: 'Religion & Spirituality', translationKey: 'categories.religion_spirituality' },
  { name: 'Psychology', translationKey: 'categories.psychology' },
  { name: 'Health & Wellness', translationKey: 'categories.health_wellness' },
  { name: 'Cooking & Food', translationKey: 'categories.cooking_food' },
  { name: 'Art & Photography', translationKey: 'categories.art_photography' },
  { name: 'Education & Study', translationKey: 'categories.education_study' },
];
