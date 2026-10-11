import { initials } from './device-item';

describe('initials', () => {
  it('takes the first letters of up to three words', () => {
    expect(initials('Host Hub')).toBe('HH');
    expect(initials('Linux build server')).toBe('LBS');
    expect(initials('my-old_living room pi')).toBe('MOL');
  });

  it('takes the first two letters of a single word', () => {
    expect(initials('Printer')).toBe('PR');
    expect(initials('pi')).toBe('PI');
  });

  it('keeps letters made of two code units whole', () => {
    expect(initials('𝔸lpha 𝔹eta')).toBe('𝔸𝔹');
  });

  it('is empty for an empty name', () => {
    expect(initials('')).toBe('');
  });
});
