const { getDefaultConfig } = require('expo/metro-config');
const fs = require('fs');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const DATETIMEPICKER_SRC =
  `${path.sep}@react-native-community${path.sep}datetimepicker${path.sep}src${path.sep}`;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    (moduleName === './timepicker' || moduleName === './datepicker') &&
    context.originModulePath.includes(DATETIMEPICKER_SRC)
  ) {
    const dir = path.dirname(context.originModulePath);
    const name = moduleName.slice(2);
    const candidates = [
      platform ? path.join(dir, `${name}.${platform}.js`) : null,
      path.join(dir, `${name}.android.js`),
      path.join(dir, `${name}.js`),
    ].filter(Boolean);

    for (const filePath of candidates) {
      if (fs.existsSync(filePath)) {
        return { type: 'sourceFile', filePath };
      }
    }
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
