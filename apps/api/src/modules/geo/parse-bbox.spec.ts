import { BadRequestException } from '@nestjs/common';
import { parseBbox } from './parse-bbox';

describe('parseBbox', () => {
  it('parses a valid bbox string', () => {
    expect(parseBbox('-46.70,-23.60,-46.60,-23.50')).toEqual({
      minLng: -46.7,
      minLat: -23.6,
      maxLng: -46.6,
      maxLat: -23.5,
    });
  });

  it('rejects a missing bbox', () => {
    expect(() => parseBbox(undefined)).toThrow(BadRequestException);
    expect(() => parseBbox('   ')).toThrow(BadRequestException);
  });

  it('rejects a bbox that does not have exactly four parts', () => {
    expect(() => parseBbox('-46.7,-23.6,-46.6')).toThrow('minLng,minLat,maxLng,maxLat');
  });

  it('rejects non-numeric coordinates', () => {
    expect(() => parseBbox('-46.7,-23.6,east,-23.5')).toThrow('finite numbers');
  });

  it('rejects coordinates out of range', () => {
    expect(() => parseBbox('-46.7,-23.6,-46.6,91')).toThrow('out of range');
    expect(() => parseBbox('-181,-23.6,-46.6,-23.5')).toThrow('out of range');
  });

  it('rejects a bbox whose min is not strictly less than max', () => {
    expect(() => parseBbox('-46.6,-23.6,-46.7,-23.5')).toThrow('strictly less');
    expect(() => parseBbox('-46.7,-23.5,-46.6,-23.5')).toThrow('strictly less');
  });
});
