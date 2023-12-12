import React, { useCallback, useState } from 'react';
import { RadialNumberSelect, RadialNumberSelectProps } from '../RadialNumberSelect';
import { createPortal } from 'react-dom';

import './styles.scss';
import { useVibrate } from '../../hooks/useVibrate';

export interface InitiativeControlProps {
    name: string;
    id: number,
    initiative: number;
    secondaryInitiative: number;
    isSecondary: boolean;
    hideInitiative: boolean;
    setInitiative: (id: number, value: number, isSecondary: boolean) => void;
}

export function InitiativeControl(props: InitiativeControlProps) {
    const {
        name,
        initiative,
        secondaryInitiative,
        setInitiative,
        id,
        hideInitiative,
        isSecondary
    } = props;

    const [isSetting, setIsSetting] = useState(false);

    const vibrate = useVibrate();
    const setIsSettingTrue = useCallback(() => {
        vibrate([10, 30, 20, 10]);
        setIsSetting(true);
    }, []);
    const onInitiativeSet = useCallback((value: number) => {
        setInitiative(id, value, isSecondary);
        setIsSetting(false);
    }, [setInitiative, id]);
    const initiativeToChange = isSecondary ? secondaryInitiative : initiative;

    return <div className={ 'InitiativeControl-wrapper' }>
        <div className={ 'InitiativeControl-clickCatch' } onClick={ setIsSettingTrue }/>
        <div className={ 'InitiativeControl-number' }>{ getInitiativeDisplay(initiativeToChange, hideInitiative) }</div>
        { isSetting
            ? createPortal(<SelectInitiativeOverlay initialValue={ initiativeToChange }
                                                    name={ name }
                                                    hideValue={ hideInitiative }
                                                    close={ () => setIsSetting(false) }
                                                    onValueSet={ onInitiativeSet }/>, document.querySelector('.App-header'))
            : null
        }
    </div>
}

function SelectInitiativeOverlay(props: RadialNumberSelectProps) {
    return <>
        <div className={ 'overlay' }/>
        <RadialNumberSelect { ...props }/>
    </>
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
