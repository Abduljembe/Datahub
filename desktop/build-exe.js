// ============================================================================
// DataHub Desktop - Executable Builder Script
// Packages web build into Windows .EXE application
// ============================================================================

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('====================================================');
console.log('   DATAHUB DESKTOP - WINDOWS .EXE BUILD PIPELINE     ');
console.log('====================================================\n');

// 1. Build Vite frontend bundle
console.log('[1/3] Building production web assets...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('  -> Frontend bundle successfully compiled into dist/\n');
} catch (err) {
  console.error('Failed to compile web bundle:', err);
  process.exit(1);
}

// 2. Verify desktop directory assets
console.log('[2/3] Verifying Electron & Windows launcher manifests...');
const desktopDir = path.resolve('desktop');
const requiredFiles = [
  'electron-main.cjs',
  'preload.cjs',
  'DataHub-Desktop-Launcher.bat',
  'DataHub-Silent-Launcher.vbs'
];

for (const file of requiredFiles) {
  const filePath = path.join(desktopDir, file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✓ Found: ${file}`);
  } else {
    console.warn(`  ! Missing: ${file}`);
  }
}

// 3. Packaging instructions
console.log('\n[3/3] Ready to package Windows Executables!');
console.log('\nTo compile the standalone .exe binary on any machine:');
console.log('  Option A (Direct Electron Builder):');
console.log('    npx electron-builder --config desktop/electron-builder.json --win');
console.log('\n  Option B (Portable App Launcher):');
console.log('    Double click "desktop/DataHub-Desktop-Launcher.bat" or run "desktop/DataHub-Silent-Launcher.vbs"');
console.log('\n  Option C (Inno Setup Installer):');
console.log('    Compile "desktop/installer.iss" using Inno Setup 6 to generate DataHub-Setup-1.0.0.exe');
console.log('\n====================================================');
