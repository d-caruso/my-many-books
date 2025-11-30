import { AdminUpdateUserDTO } from '../../../src/dtos/user/AdminUpdateUserDTO';

describe('AdminUpdateUserDTO', () => {
  it('validates proper payload', () => {
    const dto = AdminUpdateUserDTO.from({
      name: 'Jane',
      surname: 'Doe',
      email: 'jane@example.com',
      isActive: true,
      role: 'admin',
    });

    const errors = AdminUpdateUserDTO.validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.toServiceInput()).toMatchObject({ email: 'jane@example.com', role: 'admin' });
  });

  it('returns errors for invalid payload', () => {
    const dto = AdminUpdateUserDTO.from({ email: 'invalid', role: 'guest' });
    const errors = AdminUpdateUserDTO.validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
