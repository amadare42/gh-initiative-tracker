import React, { ForwardedRef, forwardRef, useCallback } from 'react';
import classNames from 'classnames';
import { InitiativeControl } from '../InitiativeControl';

import './styles.scss';
import { useScrollIntoViewWhenActive } from './useScrollIntoViewWhenActive';
import { CharItemControls } from './Controls';
import { MobileClickHandler } from '../ClickHandler';
import { useForwardedRef } from '../../hooks/useForwardedRef';
import { useLocalize } from '../../localisation';

export interface Props {
    name: string;
    id: number;
    isEnemy: boolean;
    initiative: number;
    secondaryInitiative: number;
    avatar?: string;

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

export const CharItem = forwardRef((props: Props, ref: ForwardedRef<HTMLDivElement>) => {
    const { name, changeName, id, isActive, haveSecondaryInitiative } = props;
    const setActive = useCallback(() => props.setActive(id), [props.setActive, id]);
    const setEditing = useCallback(() => props.setEditingId && props.setEditingId(id), [props.setEditingId, id]);
    const t = useLocalize();

    const innerRef = useForwardedRef<HTMLDivElement>(ref);
    useScrollIntoViewWhenActive(isActive, innerRef);

    const avatarUrl = props.avatar ? `/avatars/${ props.avatar }` : null;
    const isEditingName = props.editingId === props.id;

    return <div className={ classNames('CharItem-wrapper', {
        enemy: props.isEnemy,
        player: !props.isEnemy,
        done: props.isDisabled,
        active: props.isActive,
        haveSecondary: haveSecondaryInitiative,
        noImage: !props.avatar
    }) } style={ { '--url': `url(${ avatarUrl })` } as any } ref={ innerRef }>
        <div className={ 'CharItem-background' }/>
        { !isEditingName ? <>
            <InitiativeControl { ...props } isSecondary={ false }/>
            { haveSecondaryInitiative ? <InitiativeControl { ...props } isSecondary={ true }/> : null }
        </> : null }
        <MobileClickHandler secondaryAction={ setEditing }
                            primaryAction={ props.showControls ? setEditing : setActive }>
            {
                handlers => <div className={ 'CharItem-body' } { ...handlers }>
                    {
                        isEditingName
                            ? <input defaultValue={ name }
                                     onBlur={ ev => {
                                         props.setEditingId(null);
                                         changeName(id, ev.currentTarget.value)
                                     } } autoFocus={ true }/>
                            : <span className={ 'CharItem-name' }>{ t(props.name) }</span>
                    }
                </div>
            }
        </MobileClickHandler>
        <CharItemControls show={ props.showControls } isDisabled={ props.isDisabled } actorId={ id }/>
    </div>
});
