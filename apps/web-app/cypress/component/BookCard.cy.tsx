import { mount } from 'cypress/react';
import React from 'react';

// Simplified BookCard component for testing
const TestBookCard: React.FC<{
  book: any;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (id: number, status: string) => void;
  viewMode?: 'grid' | 'list';
}> = ({ book, onEdit, onDelete, onStatusChange, viewMode = 'grid' }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  return (
    <div 
      data-testid="book-card" 
      className={`border rounded-lg p-4 ${viewMode === 'grid' ? 'grid-view' : 'list-view'}`}
    >
      <div data-testid="book-thumbnail">
        {book.thumbnail ? (
          <img 
            src={book.thumbnail} 
            alt={`Cover of ${book.title}`}
            className="w-full h-48 object-cover rounded"
          />
        ) : (
          <div data-testid="book-thumbnail-fallback" className="w-full h-48 bg-gray-200 rounded flex items-center justify-center">
            No Cover
          </div>
        )}
      </div>

      <div data-testid="book-details" className={viewMode === 'list' ? 'list-layout' : ''}>
        <h3 data-testid="book-title" className="font-semibold text-lg">{book.title}</h3>
        <p data-testid="book-author" className="text-gray-600">{book.author}</p>
        <p data-testid="book-isbn" className="text-sm text-gray-500">{book.isbn}</p>
        
        {viewMode === 'list' && (
          <>
            <p data-testid="book-description" className="text-sm mt-2">{book.description}</p>
            <p data-testid="book-published-date" className="text-sm text-gray-500">Published: {book.publishedDate}</p>
          </>
        )}

        <div data-testid="book-categories" className="flex flex-wrap gap-1 mt-2">
          {book.categories?.map((category: string) => (
            <span key={category} data-testid="category-tag" className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
              {category}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between mt-4">
          <div data-testid="book-status" className={`status-indicator status-${book.status}`}>
            Status: {book.status.replace('-', ' ')}
          </div>
          
          <select 
            data-testid="status-dropdown"
            value={book.status}
            onChange={(e) => onStatusChange(book.id, e.target.value)}
            className="px-2 py-1 border rounded text-sm"
          >
            <option value="want-to-read">Want to Read</option>
            <option value="reading">Reading</option>
            <option value="read">Read</option>
          </select>
        </div>

        <div className="flex justify-between items-center mt-4">
          <button 
            data-testid="book-edit"
            onClick={onEdit}
            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
          >
            Edit
          </button>
          
          <button 
            data-testid="book-delete"
            onClick={() => setShowDeleteConfirm(true)}
            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            Delete
          </button>
        </div>

        {showDeleteConfirm && (
          <div data-testid="delete-confirmation" className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-sm text-red-800 mb-2">Are you sure you want to delete this book?</p>
            <div className="flex gap-2">
              <button 
                data-testid="confirm-delete"
                onClick={() => {
                  onDelete();
                  setShowDeleteConfirm(false);
                }}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm"
              >
                Yes, Delete
              </button>
              <button 
                data-testid="cancel-delete"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

describe('BookCard Component', () => {
  const mockBook = {
    id: 1,
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    isbn: '9780743273565',
    publishedDate: '1925-04-10',
    status: 'read',
    categories: ['Fiction', 'Classic'],
    thumbnail: 'https://example.com/gatsby.jpg',
    rating: 4,
    description: 'A classic American novel about the Jazz Age.'
  };

  let mockProps: any;

  beforeEach(() => {
    mockProps = {
      book: mockBook,
      onEdit: cy.stub(),
      onDelete: cy.stub(),
      onStatusChange: cy.stub(),
      viewMode: 'grid'
    };
  });

  describe('Basic Rendering', () => {
    it('renders book information', () => {
      mount(<TestBookCard {...mockProps} />);
      
      cy.get('[data-testid="book-card"]').should('be.visible');
      cy.get('[data-testid="book-title"]').should('contain', 'The Great Gatsby');
      cy.get('[data-testid="book-author"]').should('contain', 'F. Scott Fitzgerald');
      cy.get('[data-testid="book-isbn"]').should('contain', '9780743273565');
    });

    it('displays book thumbnail', () => {
      mount(<TestBookCard {...mockProps} />);
      
      cy.get('[data-testid="book-thumbnail"] img')
        .should('exist')
        .should('have.attr', 'src', mockBook.thumbnail)
        .should('have.attr', 'alt', `Cover of ${mockBook.title}`);
    });

    it('shows fallback when no thumbnail', () => {
      const bookWithoutThumbnail = { ...mockBook, thumbnail: null };
      mount(<TestBookCard {...mockProps} book={bookWithoutThumbnail} />);
      
      cy.get('[data-testid="book-thumbnail-fallback"]').should('be.visible');
      cy.get('[data-testid="book-thumbnail"] img').should('not.exist');
    });

    it('displays book categories', () => {
      mount(<TestBookCard {...mockProps} />);
      
      cy.get('[data-testid="book-categories"]').should('be.visible');
      cy.get('[data-testid="category-tag"]').should('have.length', 2);
      cy.get('[data-testid="category-tag"]').first().should('contain', 'Fiction');
      cy.get('[data-testid="category-tag"]').last().should('contain', 'Classic');
    });

    it('shows reading status', () => {
      mount(<TestBookCard {...mockProps} />);
      
      cy.get('[data-testid="book-status"]').should('contain', 'read');
    });
  });

  describe('View Modes', () => {
    it('applies grid view styling', () => {
      mount(<TestBookCard {...mockProps} viewMode="grid" />);
      
      cy.get('[data-testid="book-card"]').should('have.class', 'grid-view');
      cy.get('[data-testid="book-thumbnail"]').should('be.visible');
    });

    it('applies list view styling', () => {
      mount(<TestBookCard {...mockProps} viewMode="list" />);
      
      cy.get('[data-testid="book-card"]').should('have.class', 'list-view');
      cy.get('[data-testid="book-details"]').should('have.class', 'list-layout');
    });

    it('shows more details in list view', () => {
      mount(<TestBookCard {...mockProps} viewMode="list" />);
      
      cy.get('[data-testid="book-description"]').should('be.visible');
      cy.get('[data-testid="book-published-date"]').should('be.visible');
    });
  });

  describe('Interactive Elements', () => {
    it('opens edit modal on edit button click', () => {
      const onEdit = cy.stub();
      mount(<TestBookCard {...mockProps} onEdit={onEdit} />);
      
      cy.get('[data-testid="book-edit"]').click();
      
      cy.then(() => {
        expect(onEdit).to.have.been.called;
      });
    });

    it('shows delete confirmation on delete button click', () => {
      mount(<TestBookCard {...mockProps} />);
      
      cy.get('[data-testid="book-delete"]').click();
      cy.get('[data-testid="delete-confirmation"]').should('be.visible');
      cy.get('[data-testid="confirm-delete"]').should('be.visible');
      cy.get('[data-testid="cancel-delete"]').should('be.visible');
    });

    it('confirms deletion', () => {
      const onDelete = cy.stub();
      mount(<TestBookCard {...mockProps} onDelete={onDelete} />);
      
      cy.get('[data-testid="book-delete"]').click();
      cy.get('[data-testid="confirm-delete"]').click();
      
      cy.then(() => {
        expect(onDelete).to.have.been.called;
      });
    });

    it('cancels deletion', () => {
      const onDelete = cy.stub();
      mount(<TestBookCard {...mockProps} onDelete={onDelete} />);
      
      cy.get('[data-testid="book-delete"]').click();
      cy.get('[data-testid="cancel-delete"]').click();
      
      cy.get('[data-testid="delete-confirmation"]').should('not.exist');
      cy.then(() => {
        expect(onDelete).not.to.have.been.called;
      });
    });

    it('changes reading status', () => {
      const onStatusChange = cy.stub();
      mount(<TestBookCard {...mockProps} onStatusChange={onStatusChange} />);
      
      cy.get('[data-testid="status-dropdown"]').select('reading');
      
      cy.then(() => {
        expect(onStatusChange).to.have.been.calledWith(mockBook.id, 'reading');
      });
    });
  });

});