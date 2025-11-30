import { CreateBookDTO } from '../../../src/dtos/book/CreateBookDTO';
import { UpdateBookDTO } from '../../../src/dtos/book/UpdateBookDTO';

describe('Book DTO validation', () => {
  it('validates CreateBookDTO successfully', () => {
    const dto = CreateBookDTO.from({
      title: 'Valid Title',
      isbnCode: '9781234567890',
    });

    const errors = CreateBookDTO.validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('returns errors for invalid CreateBookDTO', () => {
    const dto = CreateBookDTO.from({
      title: '',
      isbnCode: 'short',
    });

    const errors = CreateBookDTO.validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('validates UpdateBookDTO optionally', () => {
    const dto = UpdateBookDTO.from({
      notes: 'Updated notes',
    });

    const errors = UpdateBookDTO.validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.notes).toBe('Updated notes');
  });

  it('maps CreateBookDTO to service input', () => {
    const dto = CreateBookDTO.from({
      title: 'Map Title',
      isbnCode: '9780000000000',
      editionNumber: 2,
      status: 'reading',
      authorIds: [1, 2],
    });

    const input = dto.toServiceInput();
    expect(input).toMatchObject({
      title: 'Map Title',
      isbnCode: '9780000000000',
      editionNumber: 2,
      status: 'reading',
      authorIds: [1, 2],
    });
  });

  it('maps UpdateBookDTO to partial service input', () => {
    const dto = UpdateBookDTO.from({
      notes: 'Changed notes',
    });

    const input = dto.toServiceInput();
    expect(input).toEqual({ notes: 'Changed notes' });
  });
});
