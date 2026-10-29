// Isolated local UI acceptance; standard routes, fixed text, no real API key.
import {makeServer} from '../server.mjs';
const port=Number(process.env.PORT)||5208;
makeServer({config:{}}).listen(port,'127.0.0.1',()=>console.log('S10-01 UI QA: http://127.0.0.1:'+port));
