import { createContext, MouseEventHandler, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import "./RadialNumberSelect.scss";

export interface DrawerProps {
    name: string;
    initialValue: number | null
    onValueSet: (value: number) => void;
}

export function Drawer({ name, initialValue, onValueSet }: DrawerProps) {
    let [isOpen, setIsOpen] = useState(false);
    let [total, setTotal] = useState(initialValue);
    let [isSecond, setIsSecond] = useState(false);
    let [isDone, setIsDone] = useState(false);
    const drawerContext = useContext(DrawerContext);
    useEffect(() => {
        setIsOpen(true);
        drawerContext.setIsDrawerOpened(true);
        return () => {
            setIsOpen(false);
            drawerContext.setIsDrawerOpened(false);
        }
    }, []);

    let onNumberClick = useMemo<MouseEventHandler<HTMLDivElement>>(() => (ev) => {
        let n = parseInt(ev.currentTarget.getAttribute("data-num"));
        if (!isSecond) {
            setTotal(n);
            setIsSecond(true);
        } else {
            onValueSet(total * 10 + n);
        }
    }, [total, isSecond, onValueSet]);

    let items = useMemo(() => {
        let buttons = Array.from({ length: 10 }, (v, k) => {
            let render = !isSecond
                ? (o: any) => <div data-num={k} onClick={onNumberClick} className={isDone ? 'darken' : ''}>
                    <span>{ k }</span>
                    <span className={ 'darken' }>0</span>
                </div>
                : (o: any) => <div data-num={k} onClick={onNumberClick} className={isDone ? 'darken' : ''}>
                    <span className={ 'darken' }>{ total }</span>
                    <span>{k}</span>
                </div>
            return { id: k, render, isEmpty: false };
        });

        if (localStorage.getItem('feature/clock') == 'true') {
            buttons.push({ id: 11, render: () => <div/>, isEmpty: true });
            buttons.push({ id: 12, render: () => <div/>, isEmpty: true });
        }
        // move first element to end
        buttons.push(buttons.shift()!);

        return buttons;
    }, [isSecond, total, onNumberClick, isDone]);

    let onCancel = useCallback(() => {
        onValueSet(initialValue)
    }, [initialValue, onValueSet]);

    return <div className={"Drawer-container"}>
        {
            items.map((item, idx) => {
                if (item.isEmpty) {
                    return null;
                }

                let angle = 360 * ((idx + 1) / items.length);
                if (angle > 180) angle = -(360 - angle);

                if (angle < 180) {
                    angle /= 1;
                } else if (angle > 180) {
                    angle = 180;
                }
                let parentStyle = isOpen ? { transform: `rotateZ(${ angle }deg)` } : {
                    transform: `rotateZ(0deg)`,
                    opacity: 0
                };
                const itemAngle = 360 - angle;
                const itemStyle = isOpen ? { transform: `rotateZ(${ itemAngle }deg)` } : undefined;
                if (idx === items.length - 1) {
                    parentStyle.opacity = 1;
                }
                return <div className={ 'Drawer-itemParent' } key={ item.id } style={ parentStyle }>
                    <div className={ 'Drawer-item' } data-id={ item.id }>
                        <div style={ itemStyle } >
                            { item.render({ isOpen }) }
                        </div>
                    </div>
                </div>
            }).filter(e => !!e)
        }
        <div className={'Drawer-centeredContainer' + (isOpen ? " isOpen" : "")} onClick={onCancel}>
            <span>{ name }</span>
            { total == null ? "??" : total }
        </div>
    </div>
}

export const DrawerContext = createContext({
    isDrawerOpened: false, setIsDrawerOpened: (v: boolean) => {}
});
