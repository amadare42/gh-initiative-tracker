import { FaSync } from 'react-icons/fa';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAppDispatch } from '../../store';
import { refreshClientIdAction } from '../../store/serverConnectionSlice';

interface Props {
    connectionId: string;
}

export function RefreshConnectionButton({ connectionId }: Props) {
    const [isWaitingForServer, setIsWaitingForServer] = useState(false);
    const dispatch = useAppDispatch();
    const timeoutRef = useRef<number | null>(null);

    useEffect(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setIsWaitingForServer(false);
    }, [connectionId]);

    const changeConnectionId = useCallback(async () => {
        setIsWaitingForServer(true);
        await dispatch(refreshClientIdAction());
        timeoutRef.current = window.setTimeout(() => setIsWaitingForServer(false), 5000);
    }, []);

    return <span style={ { paddingLeft: '0.25em', paddingTop: '.1em' } }>
        { isWaitingForServer
            ? <FaSync className={ 'RefreshConnectionButton-spinner' }/>
            : <FaSync onClick={ changeConnectionId }/> }
    </span>
}
