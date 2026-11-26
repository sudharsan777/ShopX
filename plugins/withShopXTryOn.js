const { withGradleProperties } = require('@expo/config-plugins');

module.exports = function withShopXTryOn(config) {
  return withGradleProperties(config, config => {
    const key = 'android.minSdkVersion';
    const minimum = config.modResults.find(item => item.type === 'property' && item.key === key);
    if (minimum) {
      minimum.value = String(Math.max(24, Number(minimum.value)));
    } else {
      config.modResults.push({ type: 'property', key, value: '24' });
    }
    return config;
  });
};
