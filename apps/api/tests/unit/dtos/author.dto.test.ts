import { CreateAuthorDTO } from '../../../src/dtos/author/CreateAuthorDTO';
import { UpdateAuthorDTO } from '../../../src/dtos/author/UpdateAuthorDTO';

describe('Author DTO validation', () => {
  it('validates CreateAuthorDTO successfully', () => {
    const dto = CreateAuthorDTO.from({
      name: 'John',
      surname: 'Doe',
      nationality: 'IT',
    });

    const errors = CreateAuthorDTO.validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.toServiceInput()).toMatchObject({
      name: 'John',
      surname: 'Doe',
      nationality: 'IT',
    });
  });

  it('returns errors for invalid CreateAuthorDTO', () => {
    const dto = CreateAuthorDTO.from({
      name: '',
      surname: '',
    });

    const errors = CreateAuthorDTO.validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('validates UpdateAuthorDTO optionally', () => {
    const dto = UpdateAuthorDTO.from({
      nationality: 'FR',
    });

    const errors = UpdateAuthorDTO.validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.toServiceInput()).toMatchObject({ nationality: 'FR' });
  });
});
