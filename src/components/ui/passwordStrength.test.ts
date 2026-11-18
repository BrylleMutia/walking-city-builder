import { passwordStrength } from './passwordStrength';

describe('passwordStrength', () => {
  it('is 0 when empty and Weak when short', () => {
    expect(passwordStrength('')).toBe(0);
    expect(passwordStrength('Ab1!')).toBe(1);
  });

  it('climbs with length and variety', () => {
    expect(passwordStrength('walkingcity')).toBe(1);
    expect(passwordStrength('walkingcity7')).toBe(2);
    expect(passwordStrength('WalkingCity7')).toBe(3);
    expect(passwordStrength('WalkingCity7!')).toBe(4);
  });

  it('keeps repeats and plain runs weak', () => {
    expect(passwordStrength('aaaaaaaaaaaa')).toBe(1);
    expect(passwordStrength('0123456789')).toBe(1);
  });
});
