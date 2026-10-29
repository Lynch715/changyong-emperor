// Local UI acceptance only: no provider key or debug/state endpoint.
import {makeServer} from '../server.mjs';
const port=Number(process.env.PORT)||5212;
makeServer({config:{}}).listen(port,'127.0.0.1',()=>console.log('S10-03 UI QA: http://127.0.0.1:'+port));
