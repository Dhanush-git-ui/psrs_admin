import { spawn } from 'child_process';

console.log('[Dev] Starting backend API server on port 3000...');
const api = spawn('npx', ['tsx', 'api/server.ts'], { stdio: 'inherit', shell: true });

console.log('[Dev] Starting Vite frontend server on port 5173...');
const vite = spawn('npx', ['vite'], { stdio: 'inherit', shell: true });

// Handle process exit signals to kill child processes cleanly
const cleanExit = () => {
  api.kill();
  vite.kill();
  process.exit();
};

process.on('SIGINT', cleanExit);
process.on('SIGTERM', cleanExit);
process.on('exit', cleanExit);
