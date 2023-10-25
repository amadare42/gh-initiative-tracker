import * as sqlite3 from 'better-sqlite3';
import { ConnectionEntry, ConnectionsTable, RoomEntry, RoomsTable } from '../model';

const db = sqlite3('local.db');
db.exec("CREATE TABLE IF NOT EXISTS rooms (id TEXT PRIMARY KEY UNIQUE, state TEXT, expire INTEGER)");
db.exec("CREATE TABLE IF NOT EXISTS connections (connectionId TEXT PRIMARY KEY UNIQUE, clientId TEXT, roomId TEXT, expire INTEGER)");

const ROOM_TTL = process.env.ROOM_TTL ? parseInt(process.env.ROOM_TTL) : 1000 * 60 * 60 * 2;
function clearExpiredRooms() {
    const stmt = db.prepare('DELETE FROM rooms WHERE expire < ?');
    stmt.run(Date.now());
}

export const roomsTable: RoomsTable = {
    getAllIds: async () => {
        clearExpiredRooms();
        const stmt = db.prepare('SELECT id FROM rooms');
        return stmt.all() as string[];
    },
    addOrUpdate: async (room) => {
        const stmt = db.prepare('INSERT OR REPLACE INTO rooms (id, state, expire) VALUES (?, ?, ?)');
        stmt.run(room.id, JSON.stringify(room.state), Date.now() + ROOM_TTL);
    },
    get: async (id) => {
        clearExpiredRooms();
        const stmt = db.prepare('SELECT state, expire FROM rooms WHERE id = ?');
        const row = stmt.get(id) as RoomEntry;
        if (!row) {
            return null;
        }
        return {
            id,
            state: JSON.parse(row.state),
            expire: row.expire
        };
    },
    hasRoom: async (id) => {
        clearExpiredRooms();
        const stmt = db.prepare('SELECT id FROM rooms WHERE id = ?');
        const row = stmt.get(id);
        return !!row;
    },
    moveExpiration: async (id) => {
        const stmt = db.prepare('UPDATE rooms SET expire = ? WHERE id = ?');
        stmt.run( Date.now() + ROOM_TTL, id);
    }
}

function clearExpiredConnections() {
    const stmt = db.prepare('DELETE FROM connections WHERE expire < ?');
    stmt.run(Date.now());
}
const CONNECTION_TTL = process.env.CONNECTION_TTL ? parseInt(process.env.CONNECTION_TTL) : 1000 * 60 * 60 * 2;
export const connectionsTable: ConnectionsTable = {
    put: async (connection) => {
        const stmt = db.prepare('INSERT OR REPLACE INTO connections (connectionId, clientId, roomId, expire) VALUES (?, ?, ?, ?)');
        stmt.run(connection.connectionId, connection.clientId, connection.roomId, Date.now() + CONNECTION_TTL);
    },
    delete: async (connectionId) => {
        const stmt = db.prepare('DELETE FROM connections WHERE connectionId = ?');
        stmt.run(connectionId);
    },
    get: async (connectionId) => {
        clearExpiredConnections();
        const stmt = db.prepare('SELECT clientId, roomId, expire FROM connections WHERE connectionId = ?');
        const row = stmt.get(connectionId) as ConnectionEntry;
        if (!row) {
            return null;
        }
        return {
            connectionId,
            clientId: row.clientId,
            roomId: row.roomId,
            expire: row.expire
        };
    },
    linkConnectionToClient: async (connectionId, clientId) => {
        const stmt = db.prepare('UPDATE connections SET clientId = ? WHERE connectionId = ?');
        stmt.run(clientId, connectionId);
    },
    linkConnectionToRoom: async (connectionId, roomId) => {
        const stmt = db.prepare('UPDATE connections SET roomId = ? WHERE connectionId = ?');
        stmt.run(roomId, connectionId);
    },
    getConnectionIdsForRoom: async (roomId) => {
        clearExpiredConnections();
        const stmt = db.prepare('SELECT connectionId FROM connections WHERE roomId = ?');
        return stmt.all(roomId).map(row => (row as ConnectionEntry).connectionId);
    },
    moveExpiration: async (connectionId) => {
        const stmt = db.prepare('UPDATE connections SET expire = ? WHERE connectionId = ?');
        let expiration = Date.now() + CONNECTION_TTL;
        stmt.run(expiration, connectionId);
        return expiration;
    }
}

export function clearAllConnections() {
    const stmt = db.prepare('DELETE FROM connections');
    stmt.run();
}
