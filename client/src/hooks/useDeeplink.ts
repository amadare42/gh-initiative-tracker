import { useEffect } from 'react';
import { store, useAppDispatch, useAppSelector } from '../store';
import { ensureConnectionAction, joinRoomAction } from '../store/serverConnectionSlice';

export function useDeeplink() {
    const dispatch = useAppDispatch();
    const roomId = useAppSelector(s => s.connection.roomId);

    useEffect(() => {
        var url = new URL(document.URL);
        var r = url.searchParams.get("r");
        if (r && r !== roomId) {
            dispatch(ensureConnectionAction())
                .then(() => dispatch(joinRoomAction({ roomId: r }) as any));
        }
    }, []);


    useEffect(() => {
        const url = new URL(document.URL);
        let state = store.getState();
        const roomId = state.connection.roomId;
        const currentRoomId = url.searchParams.get('r');

        if (currentRoomId === roomId) {
            return;
        }
        if (roomId) {
            url.searchParams.set('r', roomId);
            window.history.pushState({}, "", url.toString());
        }
        else if (!state.connection.wsActive) {
            url.searchParams.delete('r');
            window.history.pushState({}, "", url.toString());
        }
    }, [roomId]);
}
