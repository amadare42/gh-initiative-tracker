import { ConnectionEntry, Message, RoomEntry, RoomState, RoomStatePayload } from './model';
import { generateRoomId } from './util';
import { connectionsTable, roomsTable } from './db';
import { PatchOp, performPatch } from '../client/src/shared';
import hashSum from 'hash-sum';

export interface HandlerContext {
    sendMsg: SendMessageFn;
    connectionId: string;
    tailend: AddTailendPromise;
}

export type SendMessageFn = (connectionId: string, msg: string | object) => Promise<void>;

export type AddTailendPromise = (...promises: Promise<any | void>[]) => void;

function createHandlers<T extends { [key: string]: (context: HandlerContext, ...other: any[]) => any }>(handlers: T) {
    return handlers;
}

const connectionExpirations: { [id: string]: number } = {};

export const handlers = createHandlers({
    'ws.open': async ({ connectionId }, clientId: string | null) => {
        const connection: ConnectionEntry = {
            connectionId,
            clientId,
            roomId: null
        };
        await connectionsTable.put(connection);
        console.log(`Connection ${ connectionId } (clientId ${ clientId }) opened`);
    },

    'ws.closed': async ({ connectionId, tailend, sendMsg }) => {
        const connection = await connectionsTable.get(connectionId);
        if (!connection) {
            console.log(`Connection ${ connectionId } closed, but entry not found`);
            return;
        }
        const existingIds = await connectionsTable.getConnectionIdsForRoom(connection.roomId);
        if (existingIds.length) {
            await broadcastMsg(sendMsg, {
                type: 'room.playerLeft',
                data: {
                    playerId: connection.clientId,
                    playersConnected: existingIds.length
                }
            }, existingIds.filter(id => id !== connectionId));
        }
        await connectionsTable.delete(connectionId);
        await sendPlayerLeft(sendMsg, connection, tailend);
        console.log(`Connection ${ connectionId } (clientId ${ connection.clientId }) closed`);
    },

    'ws.ping': async ({ connectionId }) => {
        // move expiration only once per 2 minutes
        let expiration = connectionExpirations[connectionId];
        if (!expiration || expiration > (Date.now() / 1000) + 60 * 2) {
            expiration = await connectionsTable.moveExpiration(connectionId);
            console.log('moved expiration for connection', connectionId, expiration);
            connectionExpirations[connectionId] = expiration;
        }
    },

    'room.create': async ({ connectionId, sendMsg, tailend }, payload: RoomStatePayload) => {
        const connection = await connectionsTable.get(connectionId);
        await sendPlayerLeft(sendMsg, connection, tailend);

        const ids = await roomsTable.getAllIds();
        let id = generateRoomId();
        let iterations = 0;
        while (ids.includes(id)) {
            id = generateRoomId();
            iterations++;
            if (iterations > 100) {
                throw new Error('Failed to generate room id');
            }
        }
        const room: RoomEntry = { id, state: payload.state, hash: hashSum(payload.state) };
        await roomsTable.addOrUpdate(room);
        await connectionsTable.linkConnectionToRoom(connectionId, room.id);
        await sendWelcome(sendMsg, connection, room);

        console.log(`Created room ${ room.id } by ${ connection.connectionId } (clientId ${ connection.clientId })`);
    },

    'room.join': async ({ sendMsg, connectionId, tailend }, payload: { roomId: string, playerId?: string }) => {
        const { roomId } = payload;
        const room = await roomsTable.get(roomId);
        if (!room) {
            await sendMsg(connectionId, {
                type: 'room.notFound',
                data: { roomId }
            });
            console.log(`Room requested by ${ connectionId } (clientId ${ payload.playerId }) not found`);
            return;
        }

        const connection = await connectionsTable.get(connectionId);
        let connectionIds = await connectionsTable.getConnectionIdsForRoom(roomId);
        connectionIds = connectionIds.filter(conId => conId !== connectionId);
        const playersConnected = connectionIds.length + 1;

        await Promise.allSettled([
            connectionsTable.linkConnectionToRoom(connectionId, room.id),
            sendPlayerLeft(sendMsg, connection, tailend),
            sendWelcome(sendMsg, connection, room, playersConnected),
            broadcastMsg(sendMsg, {
                type: 'room.playerJoined',
                data: { playerId: connection.clientId, playersConnected }
            }, connectionIds)
        ]);
        console.log(`Joined room ${ room.id } by ${ connectionId } (clientId ${ payload.playerId })`);
    },

    'room.leave': async ({ sendMsg, connectionId }) => {
        const connection = await connectionsTable.get(connectionId);
        if (!connection) {
            console.log(`Connection ${ connectionId } closed, but entry not found`);
            return;
        }
        await connectionsTable.linkConnectionToRoom(connectionId, null);
        if (!connection.roomId) {
            console.log(`Connection ${ connectionId } (clientId ${ connection.clientId }) left room, but room not found`);
            return;
        }

        let connectionsIds = await connectionsTable.getConnectionIdsForRoom(connection.roomId);
        connectionsIds = connectionsIds.filter(conId => conId !== connectionId);
        await broadcastMsg(sendMsg, {
            type: 'room.playerLeft',
            data: {
                playerId: connection.clientId,
                playersConnected: connectionsIds.length
            }
        }, connectionsIds);
        console.log(`Connection ${ connectionId } (clientId ${ connection.clientId }) left room ${ connection.roomId }`);
    },

    'room.update': async ({ sendMsg, connectionId }, payload: RoomStatePayload) => {
        const connection = await connectionsTable.get(connectionId);
        if (!connection || !connection.roomId || !await roomsTable.hasRoom(connection.roomId)) {
            console.log(`Room ${ connection.roomId } not found`);
            await sendMsg(connectionId, {
                type: 'room.notFound',
                data: { roomId: connection.roomId }
            });
            return;
        }

        await roomsTable.addOrUpdate({
            id: connection.roomId,
            state: payload.state,
            hash: hashSum(payload.state)
        });

        let connectionIds = await connectionsTable.getConnectionIdsForRoom(connection.roomId);
        connectionIds = connectionIds.filter(conId => conId !== connectionId);
        await broadcastMsg(sendMsg, {
            type: 'room.update',
            data: {
                state: payload.state,
                playersConnected: connectionIds.length + 1
            }
        }, connectionIds);
    },

    'room.applyPatches': async ({ connectionId, sendMsg, tailend }, payload: { hash: string, patches: PatchOp[] }) => {
        if (!payload.patches || !payload.patches.length) {
            return;
        }
        const connection = await connectionsTable.get(connectionId);
        if (!connection || !connection.roomId || !(await roomsTable.hasRoom(connection.roomId))) {
            console.log(`Room ${ connection.roomId } not found`);
            await sendMsg(connectionId, {
                type: 'room.notFound',
                data: { roomId: connection.roomId }
            });
            return;
        }

        let stateUpdate = await patchRoomWithOptimisticLocking(connection.roomId, payload.patches);

        // if update failed, send full state (ignore patches)
        if (!stateUpdate.success) {
            console.log(`Failed to patch room ${ connection.roomId }`);
            await sendRoomUpdate(sendMsg, connection, stateUpdate.state);
            return;
        }
        console.log(`patching room ${ connection.roomId } succeeded`)

        // send full state if hashes don't match
        const newHash = stateUpdate.hash;
        if (newHash !== payload.hash) {
            console.log(`Hashes don't match: ${ newHash } !== ${ payload.hash }`);
            await sendRoomUpdate(sendMsg, connection, stateUpdate.state);
        }

        // update succeeded: broadcast patches
        let connectionIds = await connectionsTable.getConnectionIdsForRoom(connection.roomId);
        connectionIds = connectionIds.filter(conId => conId !== connectionId);
        await broadcastMsg(sendMsg, {
            type: 'room.applyPatches',
            data: {
                patches: payload.patches
            }
        }, connectionIds);

        tailend(roomsTable.moveExpiration(connection.roomId));
    },

    'room.requestUpdate': async ({ connectionId, sendMsg }, payload: { roomId: string }) => {
        const connection = await connectionsTable.get(connectionId);
        if (!connection || !connection.roomId) {
            console.log(`Connection invalid or not in room ${ connection.roomId } ${ connectionId } (clientId ${ connection.clientId })`);
            await sendMsg(connectionId, {
                type: 'room.notFound',
                data: { roomId: connection.roomId }
            });
            return;
        }

        const room = await roomsTable.get(connection.roomId);
        if (!room) {
            console.log(`Room ${ connection.roomId } not found`);
            await sendMsg(connectionId, {
                type: 'room.notFound',
                data: { roomId: connection.roomId }
            });
            return;
        }
        await sendRoomUpdate(sendMsg, connection, room.state);
        console.log(`Update requested for room ${ room.id } by ${ connection.connectionId } (clientId ${ connection.clientId })`);
    },

    'room.checkHash': async ({ connectionId, sendMsg }, payload: { hash: string }) => {
        const connection = await connectionsTable.get(connectionId);
        if (!connection || !connection.roomId) {
            return;
        }

        const roomHash = await roomsTable.getRoomHash(connection.roomId);
        if (!roomHash) {
            return;
        }

        if (roomHash!== payload.hash) {
            console.log(`Hashes don't match: ${ roomHash } !== ${ payload.hash }`);
            const room = await roomsTable.get(connection.roomId);
            await sendRoomUpdate(sendMsg, connection, room.state);
        }
    },

    'connection.setId': async ({ connectionId, sendMsg }, { id }: { id: string }) => {
        await connectionsTable.linkConnectionToClient(connectionId, id);
        await sendMsg(connectionId, {
            type: 'connection.idSet',
            data: { id }
        });
    }
});

async function sendPlayerLeft(sendMsg: SendMessageFn, connection: ConnectionEntry, tailend: AddTailendPromise) {
    if (!connection || !connection.roomId) {
        return;
    }
    let connectionIds = await connectionsTable.getConnectionIdsForRoom(connection.roomId);
    connectionIds = connectionIds.filter(conId => conId !== connection.connectionId);

    tailend(broadcastMsg(sendMsg, {
        type: 'room.playerLeft',
        data: {
            playerId: connection.clientId,
            playersConnected: connectionIds.length
        }
    }, connectionIds));
}

async function broadcastMsg(sendMsg: SendMessageFn, message: Message, connectionIds: string[]) {
    const promises = connectionIds.map(async connectionId => {
        if (connectionId === message.data.playerId) {
            return;
        }

        try {
            await sendMsg(connectionId, message);
        } catch (e) {
            if (e.statusCode === 410) {
                console.log(`Found stale connection, deleting ${ connectionId }`);
                await connectionsTable.delete(connectionId);
            } else {
                console.log('error broadcasting message', e);
                throw e;
            }
        }
    });

    await Promise.allSettled(promises);
}

async function sendWelcome(sendMsg: SendMessageFn, connection: ConnectionEntry, room: RoomEntry, playersConnected?: number) {
    let connectionIds = await connectionsTable.getConnectionIdsForRoom(room.id);
    try {
        await sendMsg(connection.connectionId, {
            type: 'room.welcome',
            data: {
                roomId: room.id,
                roomState: room.state,
                playerId: connection.clientId,
                playersConnected: playersConnected ?? connectionIds.length
            }
        });
    } catch (e) {
        console.log('error sending welcome', e);
        throw e;
    }
}

async function sendRoomUpdate(sendMsg: SendMessageFn, { connectionId, roomId }: ConnectionEntry, state: RoomState) {
    const playersConnected = await getPlayerConnectedCount(roomId);
    await sendMsg(connectionId, {
        type: 'room.update',
        data: {
            state, playersConnected
        }
    });
}

async function getPlayerConnectedCount(roomId: string) {
    return (await connectionsTable.getConnectionIdsForRoom(roomId)).length;
}

async function patchRoomWithOptimisticLocking(roomId: string, patches: PatchOp[]) {
    let newState: RoomState;
    let lockingHash: string;

    for (let i = 0; i < 10; i++) {
        const roomEntry = await roomsTable.get(roomId);
        lockingHash = hashSum(roomEntry.state);

        const patchResult = performPatch(roomEntry.state, patches);
        if (patchResult.isTestFailed) {
            console.log('patch test failed, failing update')
            break;
        }
        newState = patchResult.result;
        const newHash = hashSum(newState);
        console.log(`patching room ${ roomId } with hash ${ lockingHash } -> ${ newHash }`)

        try {
            await roomsTable.addOrUpdate({
                id: roomId,
                state: newState,
                hash: newHash
            }, lockingHash);
            return { success: true, state: newState, hash: newHash };
        } catch (e) {
            console.log(`failed to update room, retrying #${ i }`, e);
        }
    }

    return { success: false, state: newState, hash: lockingHash };
}
