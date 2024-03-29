import { useAppDispatch, useAppSelector } from '../../store';
import './styles.scss';
import { ElementState, initiativeSliceActions } from '../../store/initiativeSlice';
import classNames from 'classnames';
import { useCallback, useEffect, useMemo } from 'react';
import useLongPress from '../../utils/useLongPress';
import { FaEyeLowVision } from 'react-icons/fa6';
import { FaEye } from 'react-icons/fa';
import { uiStateActions } from '../../store/uiStateSlice';
import { useVibrate } from '../../hooks/useVibrate';

export const ELEMENTS = [
    'Wind', 'Ice', 'Fire', 'Earth', 'Light', 'Dark'
].map((name, index) => ({ index, name, url: `./elements/element-${ index }.png` }));

export function ElementsPanel() {
    const dispatch = useAppDispatch();

    const displayElements = useAppSelector(state => state.ui.displayElements);
    const editState = useAppSelector(state => state.ui.isExtraControlsVisible);
    const elements = useAppSelector(state => state.initiative.elementStates);
    const shouldDisplay = displayElements || editState;

    const history = useAppSelector(state => state.initiative.history);
    const historyRoundNo = useAppSelector(state => state.ui.historyRound);
    const historyStates = useMemo(() => history.find(h => h.round === historyRoundNo)?.elementStates ?? [], [history, historyRoundNo]);
    const isHistoryMode = useAppSelector(state => state.ui.isInHistoryMode);

    // preload images
    useEffect(() => {
        ELEMENTS.forEach((el) => {
            const img = new Image();
            img.src = el.url;
        });
    }, []);

    useEffect(() => {
        let count = ELEMENTS.length;
        if (editState) {
            count++;
        }
        document.documentElement.style.setProperty('--ElementsPanel-count', count.toString());
    }, [editState]);

    const toggleDisplayElements = useCallback(() => {
        dispatch(uiStateActions.toggleDisplayElements());
    }, []);

    if (!shouldDisplay) {
        return null;
    }

    return <div className={ 'ElementsPanel-wrapper' }>
        {
            editState ? <div className={ 'ElementsPanel-VisibilityBtn' } onClick={ toggleDisplayElements }>
                { displayElements ? <FaEyeLowVision/> : <FaEye/> }
            </div> : null
        }
        { shouldDisplay ? (isHistoryMode ? historyStates : elements).map((state, index) =>
            <ElementIcon index={ index }
                         key={ index }
                         inHistory={ isHistoryMode }
                         state={ state }/>) : null }
    </div>
}


function ElementIcon({ index, state, inHistory }: { index: number, state: ElementState, inHistory?: boolean }) {
    const dispatch = useAppDispatch();
    const vibrate = useVibrate();
    const onClick = useCallback(() => {
        if (inHistory) return;

        if (state === ElementState.Inert) {
            vibrate([10, 30, 20, 10]);
            dispatch(initiativeSliceActions.setElementState({ element: index, state: ElementState.Strong }));
        } else {
            vibrate([10, 40, 30, 10]);
            dispatch(initiativeSliceActions.setElementState({ element: index, state: ElementState.Inert }));
        }
    }, [index, state, inHistory]);
    const onLongClick = useCallback((e) => {
        e.preventDefault();
        if (inHistory) return;

        vibrate([10, 40, 30, 10]);
        let newState: ElementState;
        if (state === ElementState.Strong) {
            newState = ElementState.Waning;
        } else if (state === ElementState.Waning) {
            newState = ElementState.Strong;
        } else {
            newState = ElementState.Waning;
        }
        dispatch(initiativeSliceActions.setElementState({ element: index, state: newState }));
    }, [index, state, inHistory]);

    const handlers = useLongPress(onLongClick, onClick);
    const preventDefault = useCallback((e) => {
        e.preventDefault();
    }, []);

    return <div className={ classNames('ElementsPanel-ElementIcon', {
        strong: state === ElementState.Strong,
        waning: state === ElementState.Waning,
        inert: state === ElementState.Inert,
        dark: index === 5,
        fire: index === 2,
    }) } key={ index } { ...handlers }>
        <img className={ 'outline' }
             draggable={false}
             onContextMenu={ preventDefault }
             src={ ELEMENTS[index].url }
             alt={ ELEMENTS[index].name }/>
        <img className={ 'waning_bkg' }
             draggable={false}
             onContextMenu={ preventDefault }
             src={ ELEMENTS[index].url }
             alt={ ELEMENTS[index].name }/>
        <img className={ 'main' }
             draggable={false}
             onContextMenu={ preventDefault }
             src={ ELEMENTS[index].url } alt={ ELEMENTS[index].name }/>
    </div>
}
