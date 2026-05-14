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

describe('app.json — 16 KB page-size build config', () => {
  const buildPropertiesPlugin = appJson.expo.plugins.find(
    (p): p is [string, { android: { ndkVersion: string; packagingOptions: { jniLibs: { useLegacyPackaging: boolean } } } }] =>
      Array.isArray(p) && p[0] === 'expo-build-properties',
  );

  it('uses NDK r27 or newer', () => {
    expect(buildPropertiesPlugin).toBeDefined();
    expect(buildPropertiesPlugin![1].android.ndkVersion).toMatch(/^27\./);
  });

  it('disables legacy jniLibs packaging', () => {
    expect(buildPropertiesPlugin).toBeDefined();
    expect(buildPropertiesPlugin![1].android.packagingOptions.jniLibs.useLegacyPackaging).toBe(false);
  });
});

describe('app.json — Android permissions', () => {
  it('declares only CAMERA and INTERNET', () => {
    expect(appJson.expo.android.permissions.sort()).toEqual(['CAMERA', 'INTERNET']);
  });

  it('does not declare RECORD_AUDIO', () => {
    expect(appJson.expo.android.permissions).not.toContain('android.permission.RECORD_AUDIO');
    expect(appJson.expo.android.permissions).not.toContain('RECORD_AUDIO');
  });

  it('does not declare external storage permissions', () => {
    expect(appJson.expo.android.permissions).not.toContain('READ_EXTERNAL_STORAGE');
    expect(appJson.expo.android.permissions).not.toContain('WRITE_EXTERNAL_STORAGE');
  });
});
