import './styles.scss';
import { store, useAppDispatch, useAppSelector } from '../../store';
import {
    FaCheckCircle,
    FaHourglass,
    FaRegCircle,
    FaSync,
    FaUnlink,
    FaWindowClose
} from 'react-icons/fa';
import {
    ConnectionStatus,
    createRoomAction,
    ensureConnectionAction, joinRoomAction,
    disconnectAction
} from '../../store/serverConnectionSlice';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { CopyToClipboard } from '../CopyToClipboard';
import { RefreshConnectionButton } from './RefreshConnectionButton';

export function ConnectionControl() {
    const status = useAppSelector(state => state.connection.status);
    const isConnected = useAppSelector(state => state.connection.isConnected);
    const roomId = useAppSelector(state => state.connection.roomId);
    const playerCount = useAppSelector(state => state.connection.playerCount);
    const isWaitingForServer = useAppSelector(state => state.connection.isConnecting);
    const lastRoomId = useAppSelector(state => state.connection.lastRoomId);

    const joinTextRef = useRef<HTMLInputElement>(null);

    const dispatch = useAppDispatch();

    const createRoom = useCallback(async () => {
        await dispatch(ensureConnectionAction()).unwrap();
        dispatch(createRoomAction({ state: store.getState().initiative }) as any);
    }, [dispatch])
    const disconnectCb = useCallback(async () => {
        dispatch(disconnectAction());
    }, [dispatch]);
    const joinRoom = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const roomId = joinTextRef.current?.value;
        if (roomId) {
            await dispatch(ensureConnectionAction()).unwrap();
            await dispatch(joinRoomAction({ roomId }));
        }
    }, []);

    const [isDrawerOpened, setIsDrawerOpened] = useState(false);
    const [editRoomId, setEditRoomId] = useState('');
    const closeDrawer = useCallback(() => setIsDrawerOpened(false), []);
    const connectionId = useAppSelector(state => state.connection.connectionId);
    const connectionIdHash = useMemo(() => parseConnectionIdMetadata(connectionId), [connectionId]);
    const roomHref = useMemo(() => window.location.href.split('?')[0] + `?r=${ roomId }`, [roomId]);

    return <div className={ 'ConnectionControl-wrapper' }
                onClick={ () => !isDrawerOpened ? setIsDrawerOpened(true) : null }>
        {
            isDrawerOpened
                ? <>
                    <p onClick={ closeDrawer }><ConnectionIcon
                        status={ status }/> { status == 'Room not found' ? status + ` (${ lastRoomId })` : status }</p>
                    {
                        roomId ? <>
                            <p>Room ID: <CopyToClipboard copyText={ roomHref }>{ roomId }</CopyToClipboard></p>
                            <p>Player count: { playerCount }</p>
                        </> : null
                    }
                    {
                        connectionIdHash ?
                            <p className={ 'ConnectionControl-clientId' }>Client
                                ID: { connectionIdHash }<RefreshConnectionButton connectionId={ connectionId }/></p>
                            : null
                    }
                    <div className={ 'ConnectionControl-buttonsHorContainer' }>
                        <button onClick={ createRoom }>New Room</button>
                        <button onClick={ disconnectCb } disabled={ !isConnected }>Disconnect</button>
                    </div>
                    <form onSubmit={ joinRoom }>
                        <input type="text" placeholder="Room ID" disabled={ isWaitingForServer } ref={ joinTextRef }
                               inputMode="numeric" pattern="[0-9]*"
                               value={ editRoomId }
                               onChange={ e => setEditRoomId(e.currentTarget.value) }/>
                        <button type={ 'submit' } disabled={ isWaitingForServer || !isValidRoomId(editRoomId) }>Join
                        </button>
                    </form>
                    <div role={ 'button' } className={ 'collapse-button' } onClick={ closeDrawer }>
                        <FaWindowClose/>
                    </div>
                </> : <p><ConnectionIcon status={ status }/> { playerCount } </p>
        }
    </div>
}

function parseConnectionIdMetadata(connectionId: string) {
    if (!connectionId) return '';
    const [creationTime, id] = connectionId.split('_').slice(-2);
    const diff = new Date().getTime() - parseInt(creationTime);
    return `${ id.slice(-4) } ${ formatTimespan(diff) }`;
}

function formatTimespan(ms: number) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    const minutesStr = minutes % 60;
    const hoursStr = hours % 60;

    if (seconds < 60) return `just now`;
    if (days > 0) return `${ days }days`;

    let result = '~';
    if (hoursStr) result += `${ hoursStr }hrs `;
    if (minutesStr) result += `${ minutesStr }min`;

    return result;
}


function isValidRoomId(roomId: string) {
    let t = roomId.trim();
    if (t.length !== 4) return false;
    // all digits
    if (!/^\d+$/.test(t)) return false;
    return true;
}

function ConnectionIcon({ status }: { status: ConnectionStatus }) {
    switch (status) {
        case 'Connected':
            return <FaCheckCircle/>
        case 'Reconnecting':
            return <FaHourglass/>
        case 'Connecting':
            return <FaSync className={ 'rotating' }/>
        case 'No Room':
            return <FaRegCircle/>
        default:
        case 'Disconnected':
            return <FaUnlink/>
    }
}
