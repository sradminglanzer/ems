const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const args = process.argv.slice(2);
const clientId = args[0];
const action = (args[1] || 'release').toLowerCase(); // 'release', 'debug', 'switch', 'sync', 'run'

if (!clientId) {
    console.log(`\n======================================================`);
    console.log(`📱 White-Label Android Build & Switcher Tool`);
    console.log(`======================================================`);
    console.log(`Usage:`);
    console.log(`  build-client <client_id> [switch|run|debug|release]\n`);
    console.log(`Commands:`);
    console.log(`  switch / sync   Set active client for Android Studio Run (▶️) button`);
    console.log(`  run             Build & deploy directly to connected USB device`);
    console.log(`  release         Build production signed release APK/AAB`);
    console.log(`  debug           Build debug APK\n`);
    console.log(`Available clients in clients/ directory:`);
    const clients = fs.readdirSync(path.join(__dirname, 'clients')).filter(f => fs.statSync(path.join(__dirname, 'clients', f)).isDirectory());
    clients.forEach(c => console.log(`  - ${c}`));
    console.log(`======================================================\n`);
    process.exit(1);
}

const rootDir = __dirname;
const clientDir = path.join(rootDir, 'clients', clientId);
const configPath = path.join(clientDir, 'client.json');

if (!fs.existsSync(configPath)) {
    console.error(`\n❌ Client config not found at: ${configPath}`);
    console.error(`Available clients:`);
    const clients = fs.readdirSync(path.join(rootDir, 'clients')).filter(f => fs.statSync(path.join(rootDir, 'clients', f)).isDirectory());
    clients.forEach(c => console.log(` - ${c}`));
    process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
console.log(`\n========================================`);
console.log(`🚀 Client Target:  ${config.appName} (${config.id || clientId})`);
console.log(`📦 Application ID: ${config.applicationId}`);
console.log(`🏢 Entity ID:      ${config.entityId || '(None - dynamic login)'}`);
console.log(`🌐 API URL:        ${config.apiUrl}`);
console.log(`🏷️  Version:        ${config.versionName || '1.0.0'} (${config.versionCode || 1})`);
console.log(`⚡ Action:         ${action.toUpperCase()}`);
console.log(`========================================\n`);

const androidAppDir = path.join(rootDir, 'android', 'app');
const targetGoogleServices = path.join(androidAppDir, 'google-services.json');
const clientGoogleServices = path.join(clientDir, 'google-services.json');
const activeConfigFile = path.join(androidAppDir, 'active-client.json');

// 1. Write active-client.json for Android Studio
fs.writeFileSync(activeConfigFile, JSON.stringify(config, null, 2), 'utf8');

// 2. Inject google-services.json
if (fs.existsSync(clientGoogleServices)) {
    console.log(`📋 Injected ${clientId}/google-services.json`);
    fs.copyFileSync(clientGoogleServices, targetGoogleServices);
} else {
    console.log(`ℹ️  No google-services.json in ${clientId}/. Cleaned up target.`);
    if (fs.existsSync(targetGoogleServices)) {
        fs.unlinkSync(targetGoogleServices);
    }
}

// 3. Overlay custom icons if available
const clientResDir = path.join(clientDir, 'res');
const androidResDir = path.join(androidAppDir, 'src', 'main', 'res');

function copyDirRecursive(src, dest) {
    if (!fs.existsSync(src)) return;
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (let entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDirRecursive(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

if (fs.existsSync(clientResDir)) {
    console.log(`🎨 Overlaid custom icons from ${clientId}/res/`);
    copyDirRecursive(clientResDir, androidResDir);
}

// If just switching/syncing for Android Studio IDE
if (action === 'switch' || action === 'sync') {
    console.log(`\n✅ Android Studio is now configured for "${config.appName}"!`);
    console.log(`👉 In Android Studio, simply click the green Run (▶️) button to test on your connected device.`);
    process.exit(0);
}

// 4. Prepare Gradle parameters
const isRun = action === 'run' || action === 'install';
const buildType = isRun || action === 'debug' ? 'debug' : 'release';
const gradleTask = isRun ? 'installDebug' : (buildType === 'debug' ? 'assembleDebug' : 'assembleRelease');

const gradleArgs = [
    gradleTask,
    `-PclientAppId=${config.applicationId}`,
    `-PclientAppName=${config.appName}`,
    `-PclientApiUrl=${config.apiUrl}`,
    `-PclientEntityId=${config.entityId || ''}`,
    `-PclientVersionCode=${config.versionCode || 1}`,
    `-PclientVersionName=${config.versionName || '1.0.0'}`
];

console.log(`\n🔨 Running Gradle task: gradlew ${gradleArgs.join(' ')}\n`);

const isWindows = process.platform === 'win32';
const gradlewCmd = isWindows ? 'gradlew.bat' : './gradlew';
const gradlewCwd = path.join(rootDir, 'android');

const buildResult = spawnSync(gradlewCmd, gradleArgs, {
    cwd: gradlewCwd,
    stdio: 'inherit',
    shell: true
});

if (buildResult.status !== 0) {
    console.error(`\n❌ Build failed with exit code ${buildResult.status}`);
    process.exit(buildResult.status);
}

// If running on device, launch MainActivity via ADB
if (isRun) {
    console.log(`\n🚀 Launching app on connected device...`);
    spawnSync('adb', ['shell', 'monkey', '-p', config.applicationId, '-c', 'android.intent.category.LAUNCHER', '1'], {
        stdio: 'inherit',
        shell: true
    });
    console.log(`\n✅ App "${config.appName}" is now running on your connected device!`);
    process.exit(0);
}

// 5. Copy Output APK to dist-apps/<clientId>/
const outDir = path.join(rootDir, 'dist-apps', clientId);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const apkSearchDir = path.join(androidAppDir, 'build', 'outputs', 'apk', buildType);
if (fs.existsSync(apkSearchDir)) {
    const apks = fs.readdirSync(apkSearchDir).filter(f => f.endsWith('.apk'));
    for (const apk of apks) {
        const srcApk = path.join(apkSearchDir, apk);
        const cleanName = `${config.appName.replace(/[^a-zA-Z0-9_-]/g, '_')}-${buildType}-${config.versionName || '1.0.0'}.apk`;
        const destApk = path.join(outDir, cleanName);
        fs.copyFileSync(srcApk, destApk);
        console.log(`\n✅ Build Succeeded!`);
        console.log(`📦 Output APK: ${destApk}\n`);
    }
} else {
    console.log(`\n✅ Build Succeeded! Check android/app/build/outputs/ for outputs.`);
}
