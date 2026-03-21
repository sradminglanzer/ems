// Dynamic app config — reads tenant environment variables at build time.
// Set TENANT_APP_NAME, TENANT_PACKAGE, TENANT_ENTITY_ID before building.
// EXPO_PUBLIC_API_URL is global and stays in .env (shared across all tenants).

const fs = require('fs');

const tenantId = process.env.TENANT_ID || 'ems';
const tenantIcon = `./assets/tenants/${tenantId}/icon.png`;
const tenantSplash = `./assets/tenants/${tenantId}/splash.png`;

// Fallbacks — if the tenant doesn't have a specific icon, use the default Expo ones
const finalIcon = fs.existsSync(tenantIcon) ? tenantIcon : './assets/icon.png';
const finalSplash = fs.existsSync(tenantSplash) ? tenantSplash : './assets/splash-icon.png';

export default () => ({
    expo: {
        name: process.env.TENANT_APP_NAME || 'EMS',
        slug: 'ems',
        version: '1.0.0',
        orientation: 'portrait',
        icon: finalIcon,
        userInterfaceStyle: 'light',
        splash: {
            image: finalSplash,
            resizeMode: 'contain',
            backgroundColor: '#ffffff'
        },
        ios: {
            supportsTablet: true,
            bundleIdentifier: process.env.TENANT_PACKAGE || 'com.srgs.ems'
        },
        android: {
            adaptiveIcon: {
                backgroundColor: '#E6F4FE',
                foregroundImage: finalIcon,
                backgroundImage: './assets/android-icon-background.png',
                monochromeImage: './assets/android-icon-monochrome.png'
            },
            predictiveBackGestureEnabled: false,
            package: process.env.TENANT_PACKAGE || 'com.srgs.ems'
        },
        web: {
            favicon: './assets/favicon.png'
        },
        plugins: [
            '@react-native-community/datetimepicker',
            'expo-font',
            './config-plugins/withAndroidSigning'
        ],
        extra: {
            // Tenant entity ID — injected at build time per client
            entityId: process.env.TENANT_ENTITY_ID || process.env.EXPO_PUBLIC_ENTITY_ID,
            eas: {
                projectId: 'a4ebd661-60b2-43f7-a797-5eedd56701cf'
            }
        }
    }
});
