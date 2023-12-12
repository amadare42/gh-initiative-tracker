import './styles.scss';
import { IconType } from 'react-icons';
import { createElement } from 'react';

interface Props {
    icon: IconType;
    onClick?: () => void;
    title?: string;
}

export function FlatIconButton({ icon, title, onClick }: Props) {
    const iconEl = createElement(icon);

    return <button className="FlatIconButton" title={title} onClick={onClick}>
        { iconEl }
    </button>;
}
