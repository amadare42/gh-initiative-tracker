import useLongPress from '../../utils/useLongPress';
import { DOMAttributes } from 'react';

interface Props {
    children: (handlers: Partial<DOMAttributes<HTMLElement>>) => JSX.Element;
    primaryAction: () => void;
    secondaryAction: () => void;
}

export function MobileClickHandler({ children, primaryAction, secondaryAction }: Props) {
    const handlers = useLongPress(secondaryAction, primaryAction, {
        shouldPreventDefault: false,
        delay: 500,
    });
    return children(handlers);
}

export function DesktopClickHandler({ children, primaryAction, secondaryAction }: Props) {
    return children({
        onClick: primaryAction,
        onDoubleClick: secondaryAction
    });
}
