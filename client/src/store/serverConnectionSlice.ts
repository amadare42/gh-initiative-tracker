import { createAppAsyncThunk } from './createAppAsyncThunk';
import { getRoomHashSelector, initiativeSliceActions, InitiativeState } from './initiativeSlice';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CallbackEvent } from '../utils/callbackEvent';
import { PatchOp } from '../shared';
import { store } from './index';

const MESSAGE_COUNT = 10;
const VERIFY_HASH_INTERVAL = 2500;
const PING_INTERVAL = 10000;
const CONNECTION_ID_KEY = 'store.serverConnection.connectionId';
const SERVER_URL = (process.env.NODE_ENV === 'production' || process.env.REACT_APP_USE_PROD_SERVER)
    ? 'wss://api.turns.amadare.top'
    : 'ws://localhost:3001/ws';

function getConnectionId() {
    let value = localStorage.getItem(CONNECTION_ID_KEY);
    if (!value || value == 'null') {
        return initConnectionId();
    }
    return value;
}

function initConnectionId() {
    const connectionId = generateConnectionId();
    localStorage.setItem(CONNECTION_ID_KEY, connectionId);
    return connectionId;
}

function generateConnectionId() {
    return 'c_' + Date.now() + '_' + Math.random().toString().substr(12);
}

export const initialState = {
    isConnected: false,
    isConnecting: false,
    wsActive: false,
    roomId: null,
    lastRoomId: null as null | string,
    playerCount: 0,
    connectionId: getConnectionId(),
    status: 'Disconnected' as ConnectionStatus,
    messages: [] as string[]
}

export type WsMessageBase<Type extends string, Data = void> = {
    type: Type;
    payload: Data;
}
export type WsMessage =
    WsMessageBase<'room.create', CreateRoomPayload>
    | WsMessageBase<'room.join', { roomId: string }>
    | WsMessageBase<'room.leave'>
    | WsMessageBase<'room.update', { state: Omit<InitiativeState, 'patchesQueue'> }>
    | WsMessageBase<'room.applyPatches', { patches: PatchOp[], hash: string }>
    | WsMessageBase<'connection.setId', { id: string }>
    | WsMessageBase<'room.requestUpdate', { roomId: string }>
    | WsMessageBase<'room.checkHash', { hash: string }>
    | WsMessageBase<'room.patch', { roomId: string, hash: string, patch: PatchOp[] }>;
export type PayloadFor<Type extends WsMessage['type']> = Extract<WsMessage, { type: Type }>['payload'];


export type ConnectionStatus = 'Connected' | 'No Room' | 'Connecting' | 'Disconnected' | 'Room not found' | 'Reconnecting';


export type CreateRoomPayload = {
    state: Omit<InitiativeState, 'patchesQueue'>;
}

let ws: WebSocket | null = null;
let pingInterval: ReturnType<typeof setTimeout> | null = null;
let delayedUpdateInterval: ReturnType<typeof setTimeout> | null = null;
let reconnectInterval: ReturnType<typeof setTimeout> | null = null;
const connectedEvent = new CallbackEvent();

function isPayloadEmpty(payload: any): payload is void {
    return payload === undefined;
}

function sendMsg<Type extends WsMessage['type']>(type: Type, payload: WsMessage['payload']) {
    if (!ws) {
        throw new Error('Not connected');
    }
    if (isPayloadEmpty(payload)) {
        ws.send(JSON.stringify({ type }));
    } else {
        let msg = { type, payload };
        ws.send(JSON.stringify(msg));
    }
    setPingInterval();
}

function ping() {
    if (!ws || ws.readyState !== ws.OPEN) {
        return;
    }
    ws.send('ping');
    setPingInterval();
}

function setPingInterval() {
    if (pingInterval) {
        clearInterval(pingInterval);
    }
    pingInterval = setInterval(ping, PING_INTERVAL);
}


function delayedUpdate() {
    if (!ws || ws.readyState !== ws.OPEN) {
        return;
    }

    const { initiative } = store.getState();
    sendMsg('room.checkHash', { hash: getRoomHashSelector(initiative) });
    console.log('checking hash')
}

function scheduleVerifyHash() {
    if (delayedUpdateInterval) {
        clearTimeout(delayedUpdateInterval);
        return;
    }

    delayedUpdateInterval = setTimeout(delayedUpdate, VERIFY_HASH_INTERVAL);
}

export const ensureConnectionAction = createAppAsyncThunk(
    'ensureConnection',
    async (_: void, { dispatch, getState }) => {
        if (!ws) {
            dispatch(connectAction());
            await connectedEvent.waitFor();
        }
    });

export const connectAction = createAppAsyncThunk(
    'connect',
    async (_: void, { dispatch, getState }) => {
        if (ws) {
            ws.close();
        }
        let connectionId = getState().connection.connectionId;
        if (!connectionId) {
            connectionId = getConnectionId();
            dispatch(serverConnectionSliceActions.setConnectionId(connectionId));
        }
        let url = new URL(SERVER_URL);
        url.searchParams.set('clientId', connectionId);
        ws = new WebSocket(url.toString());
        window['ws'] = ws;
        dispatch(serverConnectionSliceActions.setWsActive(true));
        dispatch(serverConnectionSliceActions.connecting());
        ws.onopen = () => {
            dispatch(serverConnectionSliceActions.connected());
            setPingInterval();
            let connectionState = getState().connection;
            if (connectionState.roomId) {
                sendMsg('room.join', { roomId: connectionState.roomId });
            }
            connectedEvent.invoke();
        }
        ws.onclose = () => {
            if (ws) {
                dispatch(serverConnectionSliceActions.reconnecting());
                reconnectInterval = setTimeout(() => dispatch(connectAction()), 3000);
            } else {
                dispatch(serverConnectionSliceActions.disconnected());
            }
            clearInterval(pingInterval);
            clearInterval(delayedUpdateInterval);
        }
        ws.onmessage = (message) => {
            if (message.data === 'pong') {
                return;
            }
            const data = JSON.parse(message.data);
            dispatch(onMessageAction({ message: data }));
        }
    });

export const disconnectAction = createAppAsyncThunk('disconnect', async (_: void, { dispatch, getState }) => {
    if (!ws) {
        throw new Error('Not connected');
    }
    ws.close();
    ws = null;
    clearInterval(reconnectInterval);
    dispatch(serverConnectionSliceActions.setWsActive(false));
    dispatch(serverConnectionSliceActions.disconnected());
    dispatch(serverConnectionSliceActions.setRoomId(null));
});

export const onMessageAction = createAppAsyncThunk('onMessage', async ({ message }: { message: any }, {
        dispatch,
        getState
    }) => {
        switch (message.type) {
            case 'room.welcome':
                const { roomState, playerId, roomId, playersConnected } = message.data;
                dispatch(serverConnectionSliceActions.setConnectionId(playerId));
                dispatch(initiativeSliceActions.applyState(roomState));
                dispatch(serverConnectionSliceActions.addMessage('Connected'));
                dispatch(serverConnectionSliceActions.setRoomId(roomId));
                dispatch(serverConnectionSliceActions.setPlayerCount(playersConnected));
                dispatch(serverConnectionSliceActions.connectedToRoom());
                break;

            case 'room.notFound': {
                const { roomId } = message.data;
                dispatch(serverConnectionSliceActions.notFound(roomId));
                dispatch(serverConnectionSliceActions.addMessage(`Room ${roomId} not found`));
                dispatch(serverConnectionSliceActions.setLastRoomId(roomId));
                break;
            }

            case 'room.playerJoined': {
                const { playerId, playersConnected } = message.data;
                dispatch(serverConnectionSliceActions.addMessage(`${ playerId } joined the room`));
                dispatch(serverConnectionSliceActions.setPlayerCount(playersConnected));
                break;
            }

            case 'room.playerLeft': {
                const { playerId, playersConnected } = message.data;
                dispatch(serverConnectionSliceActions.addMessage(`${ playerId } left the room`));
                dispatch(serverConnectionSliceActions.setPlayerCount(playersConnected));
                break;
            }

            case 'room.update': {
                const { state, playersConnected } = message.data;
                dispatch(initiativeSliceActions.applyState(state));
                dispatch(serverConnectionSliceActions.setPlayerCount(playersConnected));
                break;
            }

            case 'room.applyPatches': {
                const { patches } = message.data;
                dispatch(initiativeSliceActions.applyPatches(patches));
                scheduleVerifyHash();
                break;
            }

            case 'room.requestUpdate': {
                const { roomId } = message.data;
                const roomState = getState().initiative;
                if (roomId !== getState().connection.roomId) {
                    return;
                }
                sendMsg('room.update', { state: roomState });
                break;
            }

            case 'connection.idSet': {
                const { id } = message.data;
                dispatch(serverConnectionSliceActions.setConnectionId(id));
                break;
            }
        }
    }
);

export const createRoomAction = createAppAsyncThunk(
    'createRoom',
    async (payload: PayloadFor<'room.create'>) => sendMsg('room.create', payload));

export const joinRoomAction = createAppAsyncThunk(
    'joinRoom',
    async (payload: PayloadFor<'room.join'>) => {
        sendMsg('room.join', payload);
    });

export const pushRoomStateAction = createAppAsyncThunk(
    'pushRoomState',
    async (payload: PayloadFor<'room.update'>) => sendMsg('room.update', payload));

export const pushRoomPatches = createAppAsyncThunk(
    'pushRoomPatches',
    async (payload: PayloadFor<'room.applyPatches'>) => {
        sendMsg('room.applyPatches', payload);
        scheduleVerifyHash();
    });

export const refreshClientIdAction = createAppAsyncThunk(
    'refreshClientId',
    async (_: void, { dispatch, getState }) => {
        const connectionId = initConnectionId();
        dispatch(serverConnectionSliceActions.setConnectionId(connectionId));
    });

export const serverConnectionSlice = createSlice({
    name: 'serverConnection',
    initialState,
    reducers: {
        connecting: (state) => {
            state.isConnecting = true;
            state.status = 'Connecting';
        },
        setWsActive: (state, action: PayloadAction<boolean>) => {
            state.wsActive = action.payload;
        },
        connected: (state) => {
            state.isConnected = true;
            state.isConnecting = false;
            if (!state.roomId) {
                state.status = 'No Room';
            } else {
                state.status = 'Connected';
            }
        },
        connectedToRoom: (state) => {
            state.isConnected = true;
            state.isConnecting = false;
            state.status = 'Connected';
        },
        disconnected: (state) => {
            state.isConnected = false;
            state.isConnecting = false;
            state.playerCount = 0;
            state.status = 'Disconnected';
        },
        reconnecting: (state) => {
            state.isConnected = false;
            state.isConnecting = false;
            state.status = 'Reconnecting';
        },
        notFound: (state) => {
            state.isConnected = false;
            state.isConnecting = false;
            state.roomId = null;
            state.status = `Room not found`;
        },
        setLastRoomId: (state, action: PayloadAction<string>) => {
            state.lastRoomId = action.payload;
        },
        setConnectionId: (state, action: PayloadAction<string>) => {
            state.connectionId = action.payload;
        },
        addMessage: (state, action: PayloadAction<string>) => {
            // TODO: show messages in UI
            state.messages.push(action.payload);
            if (state.messages.length > MESSAGE_COUNT) {
                state.messages.shift();
            }
            console.log(action.payload);
        },
        setPlayerCount: (state, action: PayloadAction<number>) => {
            state.playerCount = action.payload;
        },
        setRoomId: (state, action: PayloadAction<string>) => {
            state.roomId = action.payload;
        }
    }
});

export const serverConnectionSliceActions = serverConnectionSlice.actions;
export const serverConnectionSliceReducer = serverConnectionSlice.reducer;
