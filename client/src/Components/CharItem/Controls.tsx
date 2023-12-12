import { useAppDispatch } from '../../store';
import { FaCheckCircle, FaTimesCircle, FaTrash } from 'react-icons/fa';
import { initiativeSliceActions, removeActor } from '../../store/initiativeSlice';
import { FlatIconButton } from '../FlatIconButton';
import React, { useCallback } from 'react';

interface Props {
    actorId: number;
    show: boolean;
    isDisabled: boolean;
}

export function CharItemControls({ actorId, show, isDisabled }: Props) {
    const dispatch = useAppDispatch();
    const toggleDisabled = useCallback(() => dispatch(initiativeSliceActions.toggleDisabled(actorId)), [dispatch, actorId]);

    return <div className={ 'CharItem-controls' }>
        { show ? <>
                <FlatIconButton title={ 'Remove actor' } icon={ FaTrash }
                                onClick={ () => dispatch(removeActor(actorId)) }/>
                <FlatIconButton title={ 'Toggle actor active' } icon={ isDisabled ? FaTimesCircle : FaCheckCircle }
                                onClick={ toggleDisabled }/>
            </>
            : null }
    </div>

}
