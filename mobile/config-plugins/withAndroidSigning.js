const { withAppBuildGradle, withGradleProperties } = require('@expo/config-plugins');

module.exports = function withAndroidSigning(config) {
    // 1. Inject keystore credentials into gradle.properties
    config = withGradleProperties(config, (config) => {
        config.modResults.push(
            { type: 'property', key: 'RELEASE_STORE_FILE', value: process.env.RELEASE_STORE_FILE || '../../release.keystore' },
            { type: 'property', key: 'RELEASE_STORE_PASSWORD', value: process.env.RELEASE_STORE_PASSWORD || '' },
            { type: 'property', key: 'RELEASE_KEY_ALIAS', value: process.env.RELEASE_KEY_ALIAS || '' },
            { type: 'property', key: 'RELEASE_KEY_PASSWORD', value: process.env.RELEASE_KEY_PASSWORD || '' }
        );
        return config;
    });

    // 2. Inject release signing config into build.gradle
    config = withAppBuildGradle(config, (config) => {
        if (config.modResults.language === 'groovy') {
            // Add release block to signingConfigs
            config.modResults.contents = config.modResults.contents.replace(
                /signingConfigs\s*{/,
                `signingConfigs {
        release {
            storeFile file(project.findProperty('RELEASE_STORE_FILE') ?: 'release.keystore')
            storePassword project.findProperty('RELEASE_STORE_PASSWORD') ?: ''
            keyAlias project.findProperty('RELEASE_KEY_ALIAS') ?: ''
            keyPassword project.findProperty('RELEASE_KEY_PASSWORD') ?: ''
        }`
            );
            
            // Switch release build type to use signingConfigs.release
            config.modResults.contents = config.modResults.contents.replace(
                /buildTypes\s*{[\s\S]*?release\s*{[\s\S]*?signingConfig signingConfigs\.debug/,
                (match) => match.replace('signingConfig signingConfigs.debug', 'signingConfig signingConfigs.release')
            );
        }
        return config;
    });

    return config;
};
