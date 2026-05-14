import easJson from '../eas.json';

describe('eas.json — submit configuration', () => {
  it('defines a production Android submit profile', () => {
    expect(easJson.submit.production.android).toBeDefined();
  });

  it('targets the internal Play track on first submission', () => {
    expect(easJson.submit.production.android.track).toBe('internal');
    expect(easJson.submit.production.android.releaseStatus).toBe('draft');
  });
});
