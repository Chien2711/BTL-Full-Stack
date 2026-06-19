import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backendDir = path.join(__dirname, 'backend');
const frontendDir = path.join(__dirname, 'frontend');

console.log('Starting backend server directly (node server.js)...');
const backend = spawn('node', ['server.js'], {
  cwd: backendDir,
  shell: false,
  stdio: 'inherit'
});

console.log('Starting frontend server directly (node node_modules/vite/bin/vite.js)...');
const frontend = spawn('node', ['node_modules/vite/bin/vite.js'], {
  cwd: frontendDir,
  shell: false,
  stdio: 'inherit'
});

backend.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.log(`Backend process exited with code ${code}`);
    process.exit(code);
  }
});

frontend.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.log(`Frontend process exited with code ${code}`);
    process.exit(code);
  }
});

process.on('SIGINT', () => {
  backend.kill();
  frontend.kill();
  process.exit(0);
});
process.on('SIGTERM', () => {
  backend.kill();
  frontend.kill();
  process.exit(0);
});
