import React, { useCallback } from 'react';
import { RadialNumberSelect } from '../RadialNumberSelect';

import './styles.scss';
import { useVibrate } from '../../hooks/useVibrate';
import { useOverlay } from '../../utils/overlay';

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

    const vibrate = useVibrate();

    const initiativeToChange = isSecondary ? secondaryInitiative : initiative;

    const { open, close } = useOverlay('initiative', close =>
        <RadialNumberSelect initialValue={ initiativeToChange }
                            name={ name }
                            hideValue={ hideInitiative }
                            close={ close }
                            onValueSet={ onInitiativeSet }/>);
    const onInitiativeSet = useCallback((value: number) => {
        setInitiative(id, value, isSecondary);
        close();
    }, [setInitiative, id, close]);
    const openOverlay = useCallback(() => {
        vibrate([10, 30, 20, 10]);
        open();
    }, [open]);

    return <div className={ 'InitiativeControl-wrapper' }>
        <div className={ 'InitiativeControl-clickCatch' } onClick={ openOverlay }/>
        <div className={ 'InitiativeControl-number' }>{ getInitiativeDisplay(initiativeToChange, hideInitiative) }</div>
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
