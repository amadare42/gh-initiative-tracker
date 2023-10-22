import {
    Character, initiativeSliceActions,
    removeActor,
    toggleDisabledAction
} from '../../store/initiativeSlice';
import React, {
    DOMAttributes,
    ForwardedRef,
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef
} from 'react';
import useLongPress from '../../utils/useLongPress';
import classNames from 'classnames';
import { InitiativeControl } from '../InitiativeControl';
import { FaCheckCircle, FaTimesCircle, FaTrash } from 'react-icons/fa';
import { useAppDispatch } from '../../store';

import './styles.scss';

export interface CharItemProps {
    name: string;
    id: number;
    isEnemy: boolean;
    initiative: number;
    secondaryInitiative: number;

    setInitiative: (id: number, value: number, isSecondary: boolean) => void;
    setActive: (id: number) => void;
    editingId: number | null;
    setEditingId?: (id: number | null) => void;
    changeName: (id: number, name: string) => void;
    isDisabled: boolean;
    isActive: boolean;
    showControls: boolean;
    hideInitiative: boolean;
    haveSecondaryInitiative: boolean;
}

export const CharItem = forwardRef((props: CharItemProps, ref: ForwardedRef<HTMLDivElement>) => {
    const { name, changeName, id, isActive, haveSecondaryInitiative } = props;
    const setActive = useCallback(() => props.setActive(id), [props.setActive, id]);
    const setEditing = useCallback(() => props.setEditingId && props.setEditingId(id), [props.setEditingId, id]);

    const dispatch = useAppDispatch();
    const toggleDisabled = useCallback(() => {
        dispatch(initiativeSliceActions.toggleDisabled(id))
    }, [dispatch, id]);

    const innerRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(ref, () => innerRef.current!, []);
    useEffect(() => {
        if (isActive) {
            setTimeout(() => innerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
        }
    }, [isActive]);

    return <div className={ classNames('CharItem-wrapper', {
        enemy: props.isEnemy,
        player: !props.isEnemy,
        done: props.isDisabled,
        active: props.isActive,
        haveSecondary: haveSecondaryInitiative
    }) } ref={ innerRef }>
        <InitiativeControl { ...props } isSecondary={false} />
        { haveSecondaryInitiative ? <InitiativeControl { ...props } isSecondary={true} /> : null }
        <MobileClickHandler secondaryAction={ setEditing } primaryAction={ props.showControls ? setEditing : setActive }>
            {
                handlers => <div className={ 'CharItem-body' } { ...handlers }>
                    {
                        props.editingId === props.id
                            ? <input value={ name } onChange={ v => changeName(id, v.currentTarget.value) }
                                     onBlur={ () => props.setEditingId(null) } autoFocus={ true }/>
                            : <span className={ 'CharItem-name' }>{ props.name }</span>
                    }
                </div>
            }
        </MobileClickHandler>
        {
            props.showControls ? <div className={ 'CharItem-controls' }>
                <FaTrash onClick={ () => dispatch(removeActor(id)) }/>
                {
                    props.isDisabled ? <FaTimesCircle onClick={ () => toggleDisabled() }/> :
                        <FaCheckCircle onClick={ () => toggleDisabled() }/>
                }
            </div> : <div className={ 'CharItem-controls' }/>
        }

    </div>
});

interface ClickHandlerProps {
    children: (handlers: Partial<DOMAttributes<HTMLElement>>) => JSX.Element;
    primaryAction: () => void;
    secondaryAction: () => void;
}

function MobileClickHandler({ children, primaryAction, secondaryAction }: ClickHandlerProps) {
    const handlers = useLongPress(secondaryAction, primaryAction, {
        shouldPreventDefault: true,
        delay: 500,
    });
    return children(handlers);
}

function DesktopClickHandler({ children, primaryAction, secondaryAction }: ClickHandlerProps) {
    return children({
        onClick: primaryAction,
        onDoubleClick: secondaryAction
    });
}
