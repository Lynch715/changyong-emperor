// Isolated fixed-text UI acceptance. No provider key or state endpoint.
import {makeServer} from '../server.mjs';
const port=Number(process.env.PORT)||5216;
makeServer({config:{}}).listen(port,'127.0.0.1',()=>console.log('S10-05 UI QA: http://127.0.0.1:'+port));
