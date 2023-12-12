import React, { useEffect, useRef, useState } from 'react';

interface Props {
    onClick: () => void
    text: string
    shown: boolean
}

export function AnimatedButton({ onClick, text, shown }: Props) {
    const ref = useRef<HTMLDivElement>(null);
    const [totallyHidden, setTotallyHidden] = useState(!shown);
    const [hideTimeout, setHideTimeout] = useState<ReturnType<typeof setTimeout>>(null);

    useEffect(() => {
        if (!shown) {
            ref.current?.classList.add('AnimatedButton-container--hidden');
            clearTimeout(hideTimeout);
            setHideTimeout(setTimeout(() => {
                setTotallyHidden(true);
            }, 200));
        } else {
            clearTimeout(hideTimeout);
            setHideTimeout(null);
            setTotallyHidden(false);
            ref.current?.classList.remove('AnimatedButton-container--hidden');
        }
    }, [shown, totallyHidden]);

    return totallyHidden
        ? null
        : <div className={'AnimatedButton-container'} ref={ref}>
            <button className={ 'ButtonsList-button' } onClick={ onClick } >{ text }</button>
        </div>
}
