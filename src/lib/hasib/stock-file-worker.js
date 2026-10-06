import { readStockFileCore } from './stockFileCore.js';
self.onmessage=async({data})=>{try{self.postMessage({result:await readStockFileCore(data.file)});}catch(error){self.postMessage({error:error.message || 'import_file_failed'});}};
