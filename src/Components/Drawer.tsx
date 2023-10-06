import {
    createContext,
    MouseEventHandler,
    TouchEventHandler,
    useCallback,
    useContext,
    useEffect,
    useMemo, useRef,
    useState
} from 'react';
import "./RadialNumberSelect.scss";
import classNames from 'classnames';

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

    let firstElementRef = useRef<HTMLDivElement>(null);
    let activateNumItem = useCallback((target: HTMLDivElement) => {
        let n = parseInt(target.getAttribute("data-num"));
        if (!isSecond) {
            setTotal(n);
            setIsSecond(true);
        } else {
            firstElementRef.current = null;
            onValueSet(total * 10 + n);
        }
    }, [total, isSecond, onValueSet]);

    const onMouseDown = useMemo<MouseEventHandler<HTMLDivElement>>(() => (ev) => {
        firstElementRef.current = ev.currentTarget.closest('.Drawer-numItem');
        activateNumItem(firstElementRef.current);
    }, [activateNumItem]);
    const onTouchStart = useMemo<TouchEventHandler<HTMLDivElement>>(() => (ev) => {
        if (firstElementRef.current) {
            return;
        }
        const touch = ev.touches[0];
        const elem = document.elementFromPoint(touch.clientX, touch.clientY)
            ?.closest('.Drawer-numItem') as HTMLDivElement | null;
        firstElementRef.current = elem;
    }, [activateNumItem]);
    let onMouseUp = useMemo<MouseEventHandler<HTMLDivElement>>(() => (ev) => {
        let elem = ev.currentTarget.closest('.Drawer-numItem') as HTMLDivElement | null;
        if (elem === firstElementRef.current) {
            firstElementRef.current = null;
            return;
        }
        firstElementRef.current = null;
        activateNumItem(elem);
    }, [activateNumItem]);
    let onTouchEnd = useMemo<TouchEventHandler<HTMLDivElement>>(() => (ev) => {
        const touch = ev.changedTouches[0];
        if (!touch) return;

        const elem = document.elementFromPoint(touch.clientX, touch.clientY)
            ?.closest('.Drawer-numItem') as HTMLDivElement | null;
        if (elem === firstElementRef.current) {
            firstElementRef.current = null;
            return;
        }
        activateNumItem(elem);
        firstElementRef.current = null;
    }, [activateNumItem]);
    let onMouseLeave = useMemo<MouseEventHandler<HTMLDivElement>>(() => (ev) => {
        firstElementRef.current = null;
    }, []);
    const onTouchMove = useMemo<TouchEventHandler<HTMLDivElement>>(() => (ev) => {
        if (!firstElementRef.current) return;

        const touch = ev.touches[0];
        const elem = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('.Drawer-numItem');
        if (elem === firstElementRef.current) {
            return;
        }
        activateNumItem(firstElementRef.current);
        firstElementRef.current = null;
    }, [activateNumItem]);

    const evts = [onMouseUp, onTouchStart, onTouchEnd, onMouseDown, onMouseLeave, onTouchMove];

    let items = useMemo(() => {
        let buttons = Array.from({ length: 10 }, (v, k) => {
            let render = !isSecond
                // first
                ? (o: any) => <div data-num={k}
                                   key={k}
                                   onTouchStart={onTouchStart}
                                   onMouseDown={onMouseDown}
                                   onMouseLeave={onMouseLeave}
                                   onTouchMove={onTouchMove}
                                   onTouchEnd={onTouchEnd}
                                   onMouseUp={onMouseUp}
                                   className={classNames('Drawer-numItem', { darken: isDone })}>
                    <span>{ k }</span>
                    <span className={ 'darken' }>0</span>
                </div>
                // second
                : (o: any) => <div data-num={k}
                                   key={k}
                                   onTouchEnd={onTouchEnd}
                                   onTouchMove={onTouchMove}
                                   onMouseLeave={onMouseLeave}
                                   onMouseUp={onMouseUp}
                                   className={classNames('Drawer-numItem', { darken: isDone })}>
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
    }, [isSecond, total, isDone, ...evts]);

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
