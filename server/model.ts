import { connectionsTable, roomsTable } from './amazon/db';

export interface Message {
    type: string;
    data: any | void;
}

export interface RoomStatePayload {
    state: any
}

// storage models
export type RoomsTable = typeof roomsTable;
export type ConnectionsTable = typeof connectionsTable;

export interface ConnectionEntry {
    connectionId: string;
    clientId: string;
    roomId: string | null;
    expire?: number;
}

export interface RoomEntry {
    id: string;
    state: any;
    expire?: number;
}
