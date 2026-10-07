#!/usr/bin/env node
import { spawn } from 'child_process';

console.log('Installing dependencies...\n');

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const install = spawn(npm, ['install'], {
  stdio: 'inherit',
  shell: true
});

install.on('close', (code) => {
  if (code !== 0) {
    console.error(`\nnpm install failed with code ${code}`);
    process.exit(code);
  }
  console.log('\n✅ Dependencies installed successfully!');
  console.log('\nNext steps:');
  console.log('1. npm run gen-data    - Generate test data');
  console.log('2. npm run dev         - Start the system');
});
