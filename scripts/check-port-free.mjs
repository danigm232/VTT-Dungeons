// Read-only launcher preflight: do not rebuild dist while another table is
// serving it. Exit 0 when free, 2 when a listener exists, and 3 on inspection error.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const port = Number(process.argv[2] ?? '3000');
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('El puerto indicado no es válido.');
  process.exit(3);
}

try {
  const { stdout } = await run('netstat', ['-ano'], { windowsHide: true });
  const pids = new Set(stdout.split(/\r?\n/).flatMap(line => {
    const fields = line.trim().split(/\s+/);
    return fields.length >= 5 && fields[1]?.endsWith(`:${port}`)
      && ['LISTENING', 'LISTEN'].includes(fields[3]?.toUpperCase() ?? '')
      ? [fields.at(-1)] : [];
  }));
  if (pids.size > 0) {
    console.error(`El puerto ${port} ya tiene un proceso escuchando (PID ${[...pids].join(', ')}).`);
    process.exit(2);
  }
} catch (error) {
  console.error('No se pudo consultar netstat para comprobar el puerto:', error);
  process.exit(3);
}
