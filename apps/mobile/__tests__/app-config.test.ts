import appJson from '../app.json';

describe('app.json — Android manifest fields', () => {
  it('declares versionName', () => {
    expect(appJson.expo.android.versionName).toBe(appJson.expo.version);
  });

  it('targets Android SDK 35', () => {
    expect(appJson.expo.android.targetSdkVersion).toBe(35);
    expect(appJson.expo.android.compileSdkVersion).toBe(35);
  });
});
