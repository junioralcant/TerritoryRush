import { bboxAround } from './bboxAround';

describe('bboxAround', () => {
  it('builds a square bounding box centered on the coordinate', () => {
    const box = bboxAround([-44.4689, -4.0361], 0.09);
    expect(box.minLng).toBeCloseTo(-44.5589);
    expect(box.maxLng).toBeCloseTo(-44.3789);
    expect(box.minLat).toBeCloseTo(-4.1261);
    expect(box.maxLat).toBeCloseTo(-3.9461);
  });

  it('uses a default radius when none is given', () => {
    const box = bboxAround([0, 0]);
    expect(box.maxLng - box.minLng).toBeCloseTo(0.18);
    expect(box.maxLat - box.minLat).toBeCloseTo(0.18);
  });
});
