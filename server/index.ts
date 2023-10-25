import { HandlerContext, handlers } from './handlers';
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';

function createCallbackAPI(requestContext) {
    const { domainName, stage } = requestContext;
    const endpoint = process.env.API_GATEWAY_ENDPOINT ?? `https://${domainName}/${stage}`;
    return new ApiGatewayManagementApiClient({
        apiVersion: 'latest',
        endpoint
    });
}

async function onConnect(event, handlerCtx: HandlerContext) {
    const { requestContext } = event;
    console.log('Connected with id ', requestContext.connectionId);
    const clientId = event.queryStringParameters.clientId;
    if (!clientId) {
        return;
    }

    await handlers['ws.open'](handlerCtx, clientId);
}

async function onMessage(event, handlerCtx: HandlerContext) {
    const msg = event.body;
    if (msg == 'ping') {
        await handlers['ws.ping'](handlerCtx);
        await handlerCtx.sendMsg(handlerCtx.connectionId, 'pong');
        return;
    }

    const message = JSON.parse(msg);
    const handler = handlers[message.type];
    if (handler) {
        await handler(handlerCtx, message.payload);
        return;
    }

    console.log('Unknown message type: ' + message.type);
}

module.exports.handler = async (event, context) => {
    const { requestContext } = event;
    let promises: Promise<any | void>[] = [];
    const callbackAPI = createCallbackAPI(requestContext);
    const handlerCtx: HandlerContext = {
        connectionId: requestContext.connectionId,
        tailend: (...promises) => promises.push(...promises),
        sendMsg: async (connectionId, msg) => {
            console.log('[SENDING MESSAGE]', connectionId, msg);
            if (typeof msg !== 'string') {
                msg = JSON.stringify(msg);
            }
            await callbackAPI.send(new PostToConnectionCommand({
                ConnectionId: connectionId,
                Data: msg
            }));
        }
    }
    console.log('[RECEIVED EVENT]', event);

    try {
        switch (requestContext.eventType) {
            case 'CONNECT': {
                await onConnect(event, handlerCtx);
                break;
            }

            case 'DISCONNECT': {
                console.log('Disconnected connection ', requestContext.connectionId);
                await handlers['ws.closed'](handlerCtx);
                break;
            }

            case 'MESSAGE': {
                await onMessage(event, handlerCtx);
                break;
            }

            default: {
                console.log('Unhandled event type ', requestContext.eventType);
                break;
            }
        }
    }
    finally {
        await Promise.all(promises);
    }

    console.log(event, context);
    return { statusCode: 200 };
};
