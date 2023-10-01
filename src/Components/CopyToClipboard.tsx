import { useCallback, useRef } from 'react';
import { FaRegCopy } from 'react-icons/fa';

import './CopyToClipboard.scss';

export function CopyToClipboard({ text }: { text: string }) {
    const ref = useRef<HTMLSpanElement>(null);

    const copy = useCallback(async () => {
        await navigator.clipboard.writeText(text);
        ref.current?.classList.add('shown');
        ref.current?.classList.remove('hidden');
        setTimeout(() => {
            ref.current?.classList.remove('shown');
            ref.current?.classList.add('hidden');
        }, 1000);
    }, [text]);
    return <span onClick={ copy }>
        { text }
        <FaRegCopy style={{ paddingLeft: '0.1em' }} />
        <span className={ 'CopyToClipboard-copied hidden' } ref={ ref }>Copied!</span>
    </span>
}
