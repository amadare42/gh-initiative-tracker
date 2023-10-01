import React, { useCallback, useMemo, useState } from 'react';
import { Drawer } from './Drawer';
import { createPortal } from 'react-dom';

export interface InitiativeControlProps {
    name: string;
    id: number,
    initiative: number;
    secondaryInitiative: number;
    isSecondary: boolean;
    hideInitiative: boolean;
    setInitiative: (id: number, value: number, isSecondary: boolean) => void;
}

export function InitiativeControl({
                                      name,
                                      initiative,
                                      secondaryInitiative,
                                      setInitiative,
                                      id,
                                      hideInitiative,
                                      isSecondary
                                  }: InitiativeControlProps) {
    const [isSetting, setIsSetting] = useState(false);
    const setIsSettingTrue = useCallback(() => setIsSetting(true), []);
    const onInitiativeSet = useCallback((value: number) => {
        setInitiative(id, value, isSecondary);
        setIsSetting(false);
    }, [setInitiative, id]);
    const initiativeToChange = isSecondary ? secondaryInitiative : initiative;

    return <div className={ 'InitiativeControl-wrapper'  }>
        <div className={ 'InitiativeControl-circle' } onClickCapture={ setIsSettingTrue }/>
        <div
            className={ 'InitiativeControl-number' }>{ getInitiativeDisplay(initiativeToChange, hideInitiative) }</div>
        { isSetting ? createPortal(<div className={ 'overlay' }/>, document.querySelector('.App-header')) : null }
        { isSetting ? createPortal(<Drawer initialValue={ initiativeToChange }
                                           name={ name }
                                           onValueSet={ onInitiativeSet }/>, document.querySelector('.App-header')) : null }
    </div>
}

function getInitiativeDisplay(initiative: number, hideInitiative: boolean) {
    if (initiative === null) {
        // long dash
        return '\u2014';
    }
    if (hideInitiative) {
        return '??';
    }
    return initiative.toString().padStart(2, '0');
}
