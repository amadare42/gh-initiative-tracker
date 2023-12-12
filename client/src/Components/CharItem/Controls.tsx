import { useAppDispatch } from '../../store';
import { FaCertificate, FaCheckCircle, FaTimesCircle, FaTrash } from 'react-icons/fa';
import { initiativeSliceActions, removeActor } from '../../store/initiativeSlice';
import { FlatIconButton } from '../FlatIconButton';
import React, { useCallback } from 'react';
import { useOverlay } from '../../utils/overlay';
import { SelectAvatarList } from '../SelectAvatarList';

interface Props {
    actorId: number;
    show: boolean;
    isDisabled: boolean;
}

export function CharItemControls({ actorId, show, isDisabled }: Props) {
    const dispatch = useAppDispatch();
    const toggleDisabled = useCallback(() => dispatch(initiativeSliceActions.toggleDisabled(actorId)), [dispatch, actorId]);
    const { open } = useOverlay('avatar', close => <SelectAvatarList actorId={ actorId } close={ close }/>)

    return show ? <div className={ 'CharItem-controls' }>
            <FlatIconButton icon={ FaCertificate } title={ 'Set avatar' } onClick={ () => open() }/>
            <FlatIconButton title={ 'Remove actor' } icon={ FaTrash }
                            onClick={ () => dispatch(removeActor(actorId)) }/>
            <FlatIconButton title={ 'Toggle actor active' } icon={ isDisabled ? FaTimesCircle : FaCheckCircle }
                            onClick={ toggleDisabled }/>
        </div>
        : null

}
