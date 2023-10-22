import { useCallback, useRef } from 'react';
import { FaRegCopy } from 'react-icons/fa';

import './styles.scss';

interface Props {
    children: React.ReactNode;
    copyText: string;
}

export function CopyToClipboard({ children, copyText }: Props) {
    const ref = useRef<HTMLSpanElement>(null);

    const copy = useCallback(async () => {
        await navigator.clipboard.writeText(copyText);
        ref.current?.classList.add('shown');
        ref.current?.classList.remove('hidden');
        setTimeout(() => {
            ref.current?.classList.remove('shown');
            ref.current?.classList.add('hidden');
        }, 1000);
    }, [copyText]);
    return <span onClick={ copy }>
        { children }
        <FaRegCopy style={{ paddingLeft: '0.1em' }} />
        <span className={ 'CopyToClipboard-copied hidden' } ref={ ref }>Copied!</span>
    </span>
}
