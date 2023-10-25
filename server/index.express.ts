import { clearAllConnections } from './local/db';

require('dotenv').config();

import { HandlerContext, handlers, SendMessageFn } from './handlers';
import { generateWsUniqueId } from './util';
import { WebSocket } from 'ws';

import * as fs from 'fs';
import * as https from 'https';

var express = require('express');
var app = express();
app.use(express.static('../client/build'));

app.get('/check', function (req, res, next) {
    res.send('OK');
    res.end();
});

const options = {
    // key: fs.readFileSync('C:\\Certbot\\live\\gh.amadare.top\\privkey.pem'),
    // cert: fs.readFileSync('C:\\Certbot\\live\\gh.amadare.top\\fullchain.pem')
}

const server = https.createServer(options, app);
var expressWs = require('express-ws')(app);
expressWs.getWss().on('connection', function (ws) {
    // ws.connectionId = generateWsUniqueId();
});

const connectedWs: { [id: string]: WebSocket } = {};
clearAllConnections();
const sendMsg: SendMessageFn = async (connectionId, msg) => {
    console.log('[SENDING MESSAGE]', connectionId, msg);
    if (typeof msg !== 'string') {
        msg = JSON.stringify(msg);
    }
    const ws = connectedWs[connectionId];
    if (ws) {
        ws.send(msg);
    }
}
async function inCtx(connectionId: string, fn: (ctx: HandlerContext) => Promise<void>) {
    const promises: Promise<void | any>[] = [];
    const tailend = (...promises: Promise<void | any>[]) => promises.push(...promises);
    await fn({ connectionId, sendMsg, tailend });
    await Promise.all(promises);
}


app.ws('/ws', async function (ws, req) {
    const clientId = req.query.clientId;
    if (!clientId) {
        return;
    }
    ws.connectionId = generateWsUniqueId();
    connectedWs[ws.connectionId] = ws;
    await inCtx(ws.connectionId, ctx => handlers['ws.open'](ctx, clientId));

    ws.on('close', () => inCtx(ws.connectionId, ctx => handlers['ws.closed'](ctx)));
    ws.on('message', async function (msg) {
        if (msg === 'ping') {
            await inCtx(ws.connectionId, ctx => handlers['ws.ping'](ctx));
            ws.send('pong');
            return;
        }
        const message = JSON.parse(msg);
        const handler = handlers[message.type];
        if (handler) {
            await inCtx(ws.connectionId, ctx => handler(ctx, message.payload));
            return;
        } else {
            console.log('Unknown message type: ' + message.type);
        }
    });
});

// server
//     .listen(443, 'gh.amadare.top', function () {
//         console.log('Listening on port %d', server.address().port);
//     });

// server.listen(80, 'ip6.amadare.top');
// server.listen(3001, 'localhost', cb);

// local http
app.listen(3001);
