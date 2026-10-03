// app.json 대신 app.config.js를 사용하면 빌드 시 환경변수를 extra에 주입할 수 있음
// expo prebuild 실행 시 process.env 값이 extra.appKey에 박힘 → expo-constants로 런타임 접근
const appJson = require('./app.json');
const brand = require('./brands/mewvo/brand.json');
const icon = './brands/mewvo/assets/icon-app-v1.png';

module.exports = {
  ...appJson,
  expo: {
    ...appJson.expo,
    name: brand.identity.names.ko,
    icon,
    plugins: [...appJson.expo.plugins, 'expo-asset'],
    android: { ...appJson.expo.android, icon },
    splash: { ...appJson.expo.splash, image: icon, backgroundColor: '#FF8B25' },
    web: { ...appJson.expo.web, favicon: icon },
    ios: {
      ...appJson.expo.ios,
      infoPlist: {
        ...appJson.expo.ios.infoPlist,
        CFBundleDisplayName: brand.identity.names.ko,
        // User confirmed on 2026-09-10: HTTPS and OS security only.
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    extra: {
      ...appJson.expo.extra,
      appKey: process.env.EXPO_PUBLIC_APP_KEY ?? '',
    },
  },
};
