import { store, useAppDispatch, useAppSelector } from '../../store';
import { initiativeSliceActions } from '../../store/initiativeSlice';
import { FaHistory, FaMinusCircle, FaPlusCircle } from 'react-icons/fa';
import classNames from 'classnames';
import { uiStateActions } from '../../store/uiStateSlice';

import './styles.scss';
import { useLocalize } from '../../localisation';

export function RoundCounter() {
    const round = useAppSelector(state => state.initiative.round);
    const isEditingMode = useAppSelector(state => state.ui.isExtraControlsVisible);
    const dispatch = useAppDispatch();
    const isHistoryMode = useAppSelector(state => state.ui.isInHistoryMode);
    const historyRound = useAppSelector(state => state.ui.historyRound);
    const t = useLocalize();

    return (
        <div className={classNames("RoundCounter-wrapper", { history: isHistoryMode })}>
            {
                isEditingMode && isHistoryMode ?
                    <FaHistory onClick={ () => dispatch(uiStateActions.historyBack({ currentRound: store.getState().initiative.round })) }/> : null
            }
            {
                isEditingMode && !isHistoryMode ?
                    <FaMinusCircle style={{ opacity: round == 1 ? 0.5 : 1 }} onClick={ () => dispatch(initiativeSliceActions.changeRound(round - 1)) }/> : null
            }
            <h1>{t('Round')} { isHistoryMode ? historyRound : round }</h1>
            {
                isEditingMode && !isHistoryMode ?
                    <FaPlusCircle onClick={ () => dispatch(initiativeSliceActions.changeRound(round + 1)) }/> : null
            }
            {
                isEditingMode && isHistoryMode ?
                    <FaHistory style={{ transform: 'rotate(180deg)' }} onClick={ () => dispatch(uiStateActions.historyForward({ currentRound: store.getState().initiative.round })) }/> : null
            }
        </div>
    );
}
