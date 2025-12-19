import { ACTIONS, RESOURCES, USER_ROLES, createAbilityFor } from '../index';

describe('authorization exports', () => {
  it('exports ACTIONS/RESOURCES/USER_ROLES', () => {
    expect(ACTIONS.READ).toBe('read');
    expect(RESOURCES.BOOK).toBe('Book');
    expect(USER_ROLES.ADMIN).toBe('admin');
  });

  it('exports createAbilityFor', () => {
    const ability = createAbilityFor(null);
    expect(ability.can(ACTIONS.READ, RESOURCES.BOOK)).toBe(true);
  });
});

