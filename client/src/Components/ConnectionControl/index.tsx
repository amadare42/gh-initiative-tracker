import './styles.scss';
import { store, useAppDispatch, useAppSelector } from '../../store';
import { FaCheckCircle, FaHourglass, FaRegCircle, FaSync, FaUnlink, FaWindowClose } from 'react-icons/fa';
import {
    ConnectionStatus,
    createRoomAction,
    disconnectAction,
    ensureConnectionAction,
    joinRoomAction
} from '../../store/serverConnectionSlice';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { CopyToClipboard } from '../CopyToClipboard';
import { ClientHash } from './ClientHash';
import { omitKeys } from '../../utils/pick';
import classNames from 'classnames';
import { useLocalize } from '../../localisation';

export function ConnectionControl() {
    const status = useAppSelector(state => state.connection.status);
    const isConnected = useAppSelector(state => state.connection.isConnected);
    const roomId = useAppSelector(state => state.connection.roomId);
    const playerCount = useAppSelector(state => state.connection.playerCount);
    const isWaitingForServer = useAppSelector(state => state.connection.isConnecting);
    const lastRoomId = useAppSelector(state => state.connection.lastRoomId);

    const joinTextRef = useRef<HTMLInputElement>(null);

    const dispatch = useAppDispatch();

    const t = useLocalize();

    const createRoom = useCallback(async () => {
        await dispatch(ensureConnectionAction()).unwrap();
        dispatch(createRoomAction({ state: omitKeys(store.getState().initiative, ['patchesQueue']) }) as any);
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
    const roomHref = useMemo(() => window.location.href.split('?')[0] + `?r=${ roomId }`, [roomId]);

    return <div className={ classNames('ConnectionControl-wrapper', { collapsed: !isDrawerOpened }) }
                onClick={ () => !isDrawerOpened ? setIsDrawerOpened(true) : null }>
        {
            isDrawerOpened
                ? <>
                    <p onClick={ closeDrawer } className={'ConnectionControl-expandedHeader'}><ConnectionIcon
                        status={ status }/> { status == 'Room not found' ? t(status) + ` (${ lastRoomId })` : t(status) }</p>
                    {
                        roomId ? <>
                            <p>{t('Room ID')}: <CopyToClipboard copyText={ roomHref }>{ roomId }</CopyToClipboard></p>
                            <p>{t('Player count')}: { playerCount }</p>
                        </> : null
                    }
                    <ClientHash connectionId={ connectionId }/>
                    <div className={ 'ConnectionControl-buttonsHorContainer' }>
                        <button onClick={ createRoom }>{t('New Room')}</button>
                        <button onClick={ disconnectCb } disabled={ !isConnected }>{t('Disconnect')}</button>
                    </div>
                    <form onSubmit={ joinRoom }>
                        <input type="text" placeholder={t("Room ID")} disabled={ isWaitingForServer } ref={ joinTextRef }
                               inputMode="numeric" pattern="[0-9]*"
                               value={ editRoomId }
                               onChange={ e => setEditRoomId(e.currentTarget.value) }/>
                        <button type={ 'submit' } disabled={ isWaitingForServer || !isValidRoomId(editRoomId) }>
                            {t('Join')}
                        </button>
                    </form>
                    <div role={ 'button' } className={ 'collapse-button' } onClick={ closeDrawer }>
                        <FaWindowClose/>
                    </div>
                </> : <p><ConnectionIcon status={ status }/> { playerCount } </p>
        }
    </div>
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
