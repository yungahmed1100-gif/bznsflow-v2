import { spawn } from 'node:child_process';
const mode = process.argv[2];
if (!['catalyst','dental'].includes(mode)) throw Error('Choose catalyst or dental');
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
  const port=mode==='catalyst'?5320:5312;
  await start(port,[mode==='catalyst'?'--plan=catalyst':'--pack=dental']);
  if(mode==='dental') await start(5313,['--pack=dental','--role=employee']);
  const suite=mode==='catalyst'?'tests/catalyst-browser.mjs':'tests/hasib-dental-browser.mjs';
  const child=spawn(process.execPath,[suite,`http://127.0.0.1:${port}`,...(mode==='dental'?['http://127.0.0.1:5313']:[])],{stdio:'inherit'});
  process.exitCode=await new Promise((resolve,reject)=>{child.once('exit',resolve);child.once('error',reject);});
} finally { for(const child of servers) child.kill(); }
