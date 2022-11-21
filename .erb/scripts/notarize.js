const { notarize } = require('electron-notarize');
const { build } = require('../../package.json');
require('dotenv').config()


exports.default = async function notarizeMacos(context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== 'darwin') {
    return;
  }

  // if (process.env.CI !== 'true') {
  //   console.warn('\x1B[1;31mSkipping notarizing step. Packaging is not running in CI\x1B[0m');
  //   return;
  // }

  if (!('APPLE_ID' in process.env && 'APPLE_ID_PASS' in process.env)) {
    console.warn(
      '\x1B[1;31mSkipping notarizing step. APPLE_ID and APPLE_ID_PASS env variables must be set\x1B[0m'
    );
    return;
  }

  const appName = context.packager.appInfo.productFilename;

  await notarize({
    appBundleId: build.appId,
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_ID_PASS,
    ascProvider: process.env.ASC_PROVIDER,
  });
};
