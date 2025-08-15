/**
 * Pre-configured form schemas for My Many Books app
 * Platform-agnostic form configurations with validation
 */

import { FormConfig, FormField } from './types';
import { FormValidator } from './FormValidator';

// Book form schema
export const bookFormSchema: FormConfig = {
  fields: [
    {
      id: 'title',
      name: 'title',
      label: 'Title',
      type: 'text',
      value: '',
      placeholder: 'Enter book title',
      required: true,
      validation: [
        FormValidator.createRequiredRule('Book title is required'),
        FormValidator.createMaxLengthRule(255, 'Title must not exceed 255 characters')
      ]
    },
    {
      id: 'isbn',
      name: 'isbn',
      label: 'ISBN',
      type: 'text',
      value: '',
      placeholder: 'Enter ISBN (optional)',
      required: false,
      validation: FormValidator.createISBNRules(),
      metadata: {
        helpText: 'ISBN-10 or ISBN-13 format'
      }
    },
    {
      id: 'authors',
      name: 'authors',
      label: 'Authors',
      type: 'select',
      value: [],
      required: true,
      validation: [
        FormValidator.createCustomRule(
          (value) => Array.isArray(value) && value.length > 0,
          'At least one author is required'
        )
      ],
      metadata: {
        description: 'Select one or more authors'
      }
    },
    {
      id: 'categories',
      name: 'categories',
      label: 'Categories',
      type: 'select',
      value: [],
      required: false,
      metadata: {
        description: 'Select book categories (optional)'
      }
    },
    {
      id: 'description',
      name: 'description',
      label: 'Description',
      type: 'textarea',
      value: '',
      placeholder: 'Enter book description (optional)',
      required: false,
      validation: [
        FormValidator.createMaxLengthRule(2000, 'Description must not exceed 2000 characters')
      ]
    },
    {
      id: 'publishedDate',
      name: 'publishedDate',
      label: 'Published Date',
      type: 'date',
      value: null,
      required: false
    },
    {
      id: 'publisher',
      name: 'publisher',
      label: 'Publisher',
      type: 'text',
      value: '',
      placeholder: 'Enter publisher (optional)',
      required: false,
      validation: [
        FormValidator.createMaxLengthRule(255, 'Publisher must not exceed 255 characters')
      ]
    },
    {
      id: 'pageCount',
      name: 'pageCount',
      label: 'Page Count',
      type: 'number',
      value: null,
      placeholder: 'Enter number of pages',
      required: false,
      validation: [
        FormValidator.createMinRule(1, 'Page count must be at least 1'),
        FormValidator.createMaxRule(50000, 'Page count seems unrealistic')
      ],
      metadata: {
        min: 1,
        max: 50000,
        step: 1
      }
    },
    {
      id: 'language',
      name: 'language',
      label: 'Language',
      type: 'select',
      value: 'en',
      required: false,
      options: [
        { label: 'English', value: 'en' },
        { label: 'Spanish', value: 'es' },
        { label: 'French', value: 'fr' },
        { label: 'German', value: 'de' },
        { label: 'Italian', value: 'it' },
        { label: 'Portuguese', value: 'pt' },
        { label: 'Russian', value: 'ru' },
        { label: 'Japanese', value: 'ja' },
        { label: 'Chinese', value: 'zh' },
        { label: 'Other', value: 'other' }
      ]
    },
    {
      id: 'status',
      name: 'status',
      label: 'Reading Status',
      type: 'select',
      value: 'in-progress',
      required: true,
      options: [
        { label: 'Currently Reading', value: 'in-progress' },
        { label: 'Paused', value: 'paused' },
        { label: 'Finished', value: 'finished' }
      ],
      validation: [
        FormValidator.createRequiredRule('Reading status is required')
      ]
    },
    {
      id: 'rating',
      name: 'rating',
      label: 'Rating',
      type: 'number',
      value: null,
      placeholder: 'Rate 1-5 stars (optional)',
      required: false,
      validation: FormValidator.createRatingRules(),
      metadata: {
        min: 1,
        max: 5,
        step: 1,
        helpText: 'Rate from 1 to 5 stars'
      }
    },
    {
      id: 'notes',
      name: 'notes',
      label: 'Notes',
      type: 'textarea',
      value: '',
      placeholder: 'Add your notes about this book (optional)',
      required: false,
      validation: [
        FormValidator.createMaxLengthRule(5000, 'Notes must not exceed 5000 characters')
      ]
    }
  ],
  validationMode: 'onBlur',
  revalidateMode: 'onChange',
  submitOnEnter: false,
  resetOnSubmit: false
};

// User profile form schema
export const userFormSchema: FormConfig = {
  fields: [
    {
      id: 'firstName',
      name: 'firstName',
      label: 'First Name',
      type: 'text',
      value: '',
      placeholder: 'Enter your first name',
      required: true,
      validation: [
        FormValidator.createRequiredRule('First name is required'),
        FormValidator.createMaxLengthRule(50, 'First name must not exceed 50 characters')
      ]
    },
    {
      id: 'lastName',
      name: 'lastName',
      label: 'Last Name',
      type: 'text',
      value: '',
      placeholder: 'Enter your last name',
      required: true,
      validation: [
        FormValidator.createRequiredRule('Last name is required'),
        FormValidator.createMaxLengthRule(50, 'Last name must not exceed 50 characters')
      ]
    },
    {
      id: 'email',
      name: 'email',
      label: 'Email Address',
      type: 'email',
      value: '',
      placeholder: 'Enter your email address',
      required: true,
      validation: [
        FormValidator.createRequiredRule('Email address is required'),
        FormValidator.createEmailRule()
      ]
    },
    {
      id: 'username',
      name: 'username',
      label: 'Username',
      type: 'text',
      value: '',
      placeholder: 'Choose a username (optional)',
      required: false,
      validation: [
        FormValidator.createMinLengthRule(3, 'Username must be at least 3 characters'),
        FormValidator.createMaxLengthRule(30, 'Username must not exceed 30 characters'),
        FormValidator.createPatternRule(
          '^[a-zA-Z0-9_-]+$',
          'Username can only contain letters, numbers, hyphens, and underscores'
        )
      ]
    },
    {
      id: 'bio',
      name: 'bio',
      label: 'Bio',
      type: 'textarea',
      value: '',
      placeholder: 'Tell us about yourself (optional)',
      required: false,
      validation: [
        FormValidator.createMaxLengthRule(500, 'Bio must not exceed 500 characters')
      ]
    },
    {
      id: 'location',
      name: 'location',
      label: 'Location',
      type: 'text',
      value: '',
      placeholder: 'Your location (optional)',
      required: false,
      validation: [
        FormValidator.createMaxLengthRule(100, 'Location must not exceed 100 characters')
      ]
    },
    {
      id: 'website',
      name: 'website',
      label: 'Website',
      type: 'url',
      value: '',
      placeholder: 'Your website URL (optional)',
      required: false,
      validation: [
        FormValidator.createUrlRule()
      ]
    },
    {
      id: 'emailNotifications',
      name: 'emailNotifications',
      label: 'Email Notifications',
      type: 'checkbox',
      value: true,
      required: false,
      metadata: {
        description: 'Receive email notifications for updates and reminders'
      }
    },
    {
      id: 'publicProfile',
      name: 'publicProfile',
      label: 'Public Profile',
      type: 'checkbox',
      value: false,
      required: false,
      metadata: {
        description: 'Make your profile visible to other users'
      }
    },
    {
      id: 'showReadingGoals',
      name: 'showReadingGoals',
      label: 'Show Reading Goals',
      type: 'checkbox',
      value: true,
      required: false,
      metadata: {
        description: 'Display your reading goals on your profile'
      }
    }
  ],
  validationMode: 'onBlur',
  revalidateMode: 'onChange',
  submitOnEnter: false,
  resetOnSubmit: false
};

// Authentication form schemas
export const authFormSchemas = {
  login: {
    fields: [
      {
        id: 'email',
        name: 'email',
        label: 'Email Address',
        type: 'email',
        value: '',
        placeholder: 'Enter your email address',
        required: true,
        validation: [
          FormValidator.createRequiredRule('Email address is required'),
          FormValidator.createEmailRule()
        ]
      },
      {
        id: 'password',
        name: 'password',
        label: 'Password',
        type: 'password',
        value: '',
        placeholder: 'Enter your password',
        required: true,
        validation: [
          FormValidator.createRequiredRule('Password is required')
        ]
      },
      {
        id: 'rememberMe',
        name: 'rememberMe',
        label: 'Remember Me',
        type: 'checkbox',
        value: false,
        required: false,
        metadata: {
          description: 'Keep me signed in on this device'
        }
      }
    ],
    validationMode: 'onBlur',
    revalidateMode: 'onChange',
    submitOnEnter: true,
    resetOnSubmit: false
  } as FormConfig,

  register: {
    fields: [
      {
        id: 'firstName',
        name: 'firstName',
        label: 'First Name',
        type: 'text',
        value: '',
        placeholder: 'Enter your first name',
        required: true,
        validation: [
          FormValidator.createRequiredRule('First name is required'),
          FormValidator.createMaxLengthRule(50, 'First name must not exceed 50 characters')
        ]
      },
      {
        id: 'lastName',
        name: 'lastName',
        label: 'Last Name',
        type: 'text',
        value: '',
        placeholder: 'Enter your last name',
        required: true,
        validation: [
          FormValidator.createRequiredRule('Last name is required'),
          FormValidator.createMaxLengthRule(50, 'Last name must not exceed 50 characters')
        ]
      },
      {
        id: 'email',
        name: 'email',
        label: 'Email Address',
        type: 'email',
        value: '',
        placeholder: 'Enter your email address',
        required: true,
        validation: [
          FormValidator.createRequiredRule('Email address is required'),
          FormValidator.createEmailRule()
        ]
      },
      {
        id: 'password',
        name: 'password',
        label: 'Password',
        type: 'password',
        value: '',
        placeholder: 'Create a secure password',
        required: true,
        validation: FormValidator.createPasswordRules(),
        metadata: {
          helpText: 'Must be at least 8 characters with uppercase, lowercase, and number'
        }
      },
      {
        id: 'confirmPassword',
        name: 'confirmPassword',
        label: 'Confirm Password',
        type: 'password',
        value: '',
        placeholder: 'Confirm your password',
        required: true,
        validation: FormValidator.createConfirmPasswordRules()
      }
    ],
    validationMode: 'onBlur',
    revalidateMode: 'onChange',
    submitOnEnter: true,
    resetOnSubmit: true
  } as FormConfig
};

// Search form schema
export const searchFormSchema: FormConfig = {
  fields: [
    {
      id: 'query',
      name: 'query',
      label: 'Search',
      type: 'text',
      value: '',
      placeholder: 'Search books, authors, or ISBN...',
      required: false,
      validation: [
        FormValidator.createMaxLengthRule(255, 'Search query must not exceed 255 characters')
      ]
    },
    {
      id: 'category',
      name: 'category',
      label: 'Category',
      type: 'select',
      value: null,
      required: false,
      options: [
        { label: 'All Categories', value: null }
        // Categories will be populated dynamically
      ]
    },
    {
      id: 'author',
      name: 'author',
      label: 'Author',
      type: 'select',
      value: null,
      required: false,
      options: [
        { label: 'All Authors', value: null }
        // Authors will be populated dynamically
      ]
    },
    {
      id: 'status',
      name: 'status',
      label: 'Reading Status',
      type: 'select',
      value: null,
      required: false,
      options: [
        { label: 'All Statuses', value: null },
        { label: 'Currently Reading', value: 'in-progress' },
        { label: 'Paused', value: 'paused' },
        { label: 'Finished', value: 'finished' }
      ]
    },
    {
      id: 'rating',
      name: 'rating',
      label: 'Minimum Rating',
      type: 'select',
      value: null,
      required: false,
      options: [
        { label: 'Any Rating', value: null },
        { label: '5 Stars', value: 5 },
        { label: '4+ Stars', value: 4 },
        { label: '3+ Stars', value: 3 },
        { label: '2+ Stars', value: 2 },
        { label: '1+ Stars', value: 1 }
      ]
    },
    {
      id: 'sortBy',
      name: 'sortBy',
      label: 'Sort By',
      type: 'select',
      value: 'title',
      required: false,
      options: [
        { label: 'Title', value: 'title' },
        { label: 'Author', value: 'author' },
        { label: 'Published Date', value: 'publishedDate' },
        { label: 'Rating', value: 'rating' },
        { label: 'Date Added', value: 'createdAt' }
      ]
    },
    {
      id: 'sortOrder',
      name: 'sortOrder',
      label: 'Sort Order',
      type: 'select',
      value: 'asc',
      required: false,
      options: [
        { label: 'Ascending (A-Z, 1-10)', value: 'asc' },
        { label: 'Descending (Z-A, 10-1)', value: 'desc' }
      ]
    }
  ],
  validationMode: 'onChange',
  revalidateMode: 'onChange',
  submitOnEnter: true,
  resetOnSubmit: false
};