// Independent loopback origin for UI checks. No real provider or state API.
import {makeServer} from '../server.mjs';
const port=Number(process.env.PORT)||5210;
makeServer({config:{}}).listen(port,'127.0.0.1',()=>console.log('S10-02 UI QA: http://127.0.0.1:'+port));
