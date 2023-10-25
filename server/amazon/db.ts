import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { ConnectionEntry, RoomEntry } from '../model';
import { marshall } from '@aws-sdk/util-dynamodb';

const ddb = new DynamoDB();

const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE || 'gh-turns_connections';
const CONNECTIONS_TTL = process.env.CONNECTIONS_TTL ? parseInt(process.env.CONNECTIONS_TTL) : 1000 * 60 * 5;
const NULL_PLACEHOLDER = "[[NULL]]";
function nullStr(str: string | null) {
    if (!str) {
        return NULL_PLACEHOLDER;
    }
    return str;
}

function fromNullStr(str: string) {
    if (str === NULL_PLACEHOLDER) {
        return null;
    }
    return str;
}
export const connectionsTable = {
    put: async (connection: ConnectionEntry) => {
        await ddb.putItem({
            TableName: CONNECTIONS_TABLE,
            Item: marshall({
                connectionId: connection.connectionId,
                clientId: nullStr(connection.clientId),
                roomId: nullStr(connection.roomId),
                expire: Date.now() + CONNECTIONS_TTL
            })
        });
    },
    delete: async (connectionId: string) => {
        await ddb.deleteItem({
            TableName: CONNECTIONS_TABLE,
            Key: { connectionId: { S: connectionId } }
        });
    },
    get: async (connectionId: string) => {
        let result = await ddb.getItem({
            TableName: CONNECTIONS_TABLE,
            Key: marshall({
                connectionId: connectionId
            })
        });
        if (!result.Item) {
            return null;
        }

        return {
            connectionId: result.Item.connectionId.S,
            clientId: fromNullStr(result.Item.clientId.S),
            roomId: fromNullStr(result.Item.roomId.S),
            expire: parseInt(result.Item.expire.N)
        } as ConnectionEntry
    },
    linkConnectionToClient: async (connectionId: string, clientId: string) => {
        await ddb.updateItem({
            TableName: CONNECTIONS_TABLE,
            Key: marshall({ connectionId }),
            UpdateExpression: 'set clientId = :clientId, expire = :expire',
            ExpressionAttributeValues: marshall({
                ':clientId': nullStr(clientId),
                ':expire': Date.now() + CONNECTIONS_TTL
            })
        });
    },
    getConnectionIdsForRoom: async (roomId: string) => {
        if (!roomId) {
            return [];
        }
        // TODO: create roomId-index
        const result = await ddb.query({
            TableName: CONNECTIONS_TABLE,
            IndexName: 'roomId-index',
            KeyConditionExpression: 'roomId = :roomId',
            ExpressionAttributeValues: {
                ':roomId': { S: roomId }
            },
            ProjectionExpression: 'connectionId'
        });
        return result.Items.map((item: any) => item.connectionId.S as string)
    },
    linkConnectionToRoom: async (connectionId: string, roomId: string | null) => {
        await ddb.updateItem({
            TableName: CONNECTIONS_TABLE,
            Key: {
                connectionId: { S: connectionId }
            },
            UpdateExpression: 'set roomId = :roomId, expire = :expire',
            ExpressionAttributeValues: {
                ':roomId': { S: nullStr(roomId) },
                ':expire': { N: (Date.now() + CONNECTIONS_TTL).toString() }
            }
        });
    },
    moveExpiration: async (connectionId: string) => {
        let expire = Date.now() + CONNECTIONS_TTL;
        await ddb.updateItem({
            TableName: CONNECTIONS_TABLE,
            Key: {
                connectionId: { S: connectionId }
            },
            UpdateExpression: 'set expire = :expire',
            ExpressionAttributeValues: {
                ':expire': { N: expire.toString() }
            }
        });
        return expire;
    }
}

const ROOM_TTL = process.env.ROOM_TTL ? parseInt(process.env.ROOM_TTL) : 1000 * 60 * 60 * 2;
const ROOM_TABLE = process.env.ROOMS_TABLE || 'gh-turns_rooms';
export const roomsTable = {
    getAllIds: async () => {
        const result = await ddb.scan({
            TableName: ROOM_TABLE,
            ProjectionExpression: 'roomId'
        });
        return result.Items.map((item: any) => item.roomId.S as string);
    },
    addOrUpdate: async (room: RoomEntry) => {
        // TODO: ensure it will create or update
        await ddb.updateItem({
            TableName: ROOM_TABLE,
            Key: marshall({ roomId: room.id }),
            UpdateExpression: 'set roomJson = :roomJson, expire = :expire',
            ExpressionAttributeValues: {
                ':roomJson': { S: JSON.stringify(room.state) },
                ':expire': { N: (Date.now() + ROOM_TTL).toString() }
            }
        });
    },
    get: async (id: string) => {
        let result = await ddb.getItem({
            TableName: ROOM_TABLE,
            Key: {
                roomId: { S: id }
            }
        });
        if (!result.Item) {
            return null;
        }
        return {
            id: result.Item.roomId.S,
            state: JSON.parse(result.Item.roomJson.S),
            expire: parseInt(result.Item.expire.N)
        } as RoomEntry;
    },
    hasRoom: async (id: string) => {
        let result = await ddb.getItem({
            TableName: ROOM_TABLE,
            Key: {
                roomId: { S: id }
            }
        });
        return !!result.Item;
    },
    moveExpiration: async (id: string) => {
        await ddb.updateItem({
            TableName: ROOM_TABLE,
            Key: {
                roomId: { S: id }
            },
            UpdateExpression: 'set expire = :expire',
            ExpressionAttributeValues: {
                ':expire': { N: (Date.now() + ROOM_TTL).toString() }
            }
        });
    }
}
