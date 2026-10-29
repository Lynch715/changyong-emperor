// Dedicated loopback QA origin; no provider credentials and no state/debug API.
import {makeServer} from '../server.mjs';
const port=Number(process.env.PORT)||5206;
makeServer({config:{}}).listen(port,'127.0.0.1',()=>console.log('S09-07 fixed-text QA: http://127.0.0.1:'+port));
