import { spawn } from 'node:child_process';
// Catalyst's demo suite. Dental runs its own demos inside tests/dental-browser.mjs.
const mode = process.argv[2];
if (mode !== 'catalyst') throw Error('Choose catalyst (dental: node tests/dental-browser.mjs)');
const servers = [];
function start(port, flags) {
  const child = spawn(process.execPath, ['scripts/hasib-demo.mjs', String(port), ...flags], { stdio: ['ignore','pipe','inherit'] });
  servers.push(child);
  return new Promise((resolve,reject) => {
    const timer=setTimeout(()=>reject(Error('Demo startup timed out')),30000);
    child.stdout.on('data', chunk=>{if(String(chunk).includes('Hasib demo')) {clearTimeout(timer);resolve();}});
    child.once('error',error=>{clearTimeout(timer);reject(error);});
    child.once('exit',code=>{clearTimeout(timer);reject(Error(`Demo exited ${code}`));});
  });
}
try {
  const port=5320;
  await start(port,['--plan=catalyst']);
  const child=spawn(process.execPath,['tests/catalyst-browser.mjs',`http://127.0.0.1:${port}`],{stdio:'inherit'});
  process.exitCode=await new Promise((resolve,reject)=>{child.once('exit',resolve);child.once('error',reject);});
} finally { for(const child of servers) child.kill(); }
