/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  EMS Desktop Multi-Client White-Label Build System
 * ═══════════════════════════════════════════════════════════════════════════════
 *  Usage:
 *    node build-desktop.js <client_id> <action>
 *
 *  Examples:
 *    node build-desktop.js lakeshore dev      --> Runs Electron in dev mode for Lakeshore
 *    node build-desktop.js lakeshore build    --> Builds production React + Electron bundle
 *    node build-desktop.js lakeshore release  --> Builds standalone Windows .exe Setup installer
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = __dirname;
const clientsDir = path.join(rootDir, 'clients');
const desktopDir = path.join(rootDir, 'desktop');

const args = process.argv.slice(2);
const clientId = args[0] || 'lakeshore';
const action = args[1] || 'build';

const clientDir = path.join(clientsDir, clientId);
const clientJsonPath = path.join(clientDir, 'client.json');

if (!fs.existsSync(clientJsonPath)) {
  console.error(`\n❌ Error: Client configuration not found at: ${clientJsonPath}\n`);
  console.log(`Available clients in clients/:`);
  fs.readdirSync(clientsDir).forEach((c) => {
    if (fs.statSync(path.join(clientsDir, c)).isDirectory()) {
      console.log(`  - ${c}`);
    }
  });
  process.exit(1);
}

const clientConfig = JSON.parse(fs.readFileSync(clientJsonPath, 'utf8'));

console.log('\n═══════════════════════════════════════════════════════════════');
console.log(`  🚀 EMS Desktop White-Label Builder`);
console.log(`  Client:   ${clientConfig.appName} (${clientId})`);
console.log(`  API URL:  ${clientConfig.apiUrl}`);
console.log(`  Action:   ${action.toUpperCase()}`);
console.log('═══════════════════════════════════════════════════════════════\n');

// 1. Generate client-config.json inside desktop/
const targetConfig = {
  clientId: clientConfig.id || clientId,
  appName: clientConfig.appName || 'EMS Desktop ERP',
  apiUrl: clientConfig.apiUrl || 'http://localhost:3000/api',
  entityId: clientConfig.entityId || '',
  versionName: clientConfig.versionName || '1.0.0',
};

fs.writeFileSync(
  path.join(desktopDir, 'client-config.json'),
  JSON.stringify(targetConfig, null, 2)
);
console.log('✅ Generated desktop/client-config.json');

// 2. Execute requested action
try {
  if (action === 'dev') {
    console.log('Starting Electron development server...');
    execSync('npm run dev', { cwd: desktopDir, stdio: 'inherit' });
  } else if (action === 'build') {
    console.log('Compiling React + Electron production bundles...');
    execSync('npm run build', { cwd: desktopDir, stdio: 'inherit' });
    console.log('\n✨ Build completed successfully in desktop/dist/\n');
  } else if (action === 'release') {
    console.log('Compiling standalone Windows .exe Installer with electron-builder...');
    execSync('npm run dist', { cwd: desktopDir, stdio: 'inherit' });
    console.log('\n🎉 Standalone Windows Installer created in desktop/dist-apps/\n');
  } else {
    console.log(`Unknown action: ${action}. Use 'dev', 'build', or 'release'.`);
  }
} catch (err) {
  console.error('\n❌ Build process failed.\n', err.message);
  process.exit(1);
}
