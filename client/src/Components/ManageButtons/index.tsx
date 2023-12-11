import './styles.scss'
import { FaEdit } from 'react-icons/fa';
import { useAppDispatch, useAppSelector } from '../../store';
import { uiStateActions } from '../../store/uiStateSlice';
import classNames from 'classnames';

export function ManageButtons() {
    const dispatch = useAppDispatch();
    const toggleExtraControls = () => dispatch(uiStateActions.toggleExtraControls());
    const isEnabled = useAppSelector(state => state.ui.isExtraControlsVisible);

    return <div className={classNames('ManageButtons-wrapper', { disabled: !isEnabled })} >
        <FaEdit onClick={ toggleExtraControls } />
    </div>
}
