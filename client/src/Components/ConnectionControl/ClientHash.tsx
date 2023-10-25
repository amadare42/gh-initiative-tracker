import React, { useEffect, useMemo, useState } from 'react';
import { RefreshConnectionButton } from './RefreshConnectionButton';

export function ClientHash({ connectionId }: { connectionId: string }) {
    const [flipFlopper, setFlipFlopper] = useState(false);
    useEffect(() => {
        const interval = setInterval(() => setFlipFlopper(f => !f), 1000 * 10);
        return () => clearInterval(interval);
    });

    const connectionIdHash = useMemo(() => parseConnectionIdMetadata(connectionId), [connectionId, flipFlopper]);
    return connectionIdHash
        ? <p className={ 'ConnectionControl-clientId' }>
            Client hash: { connectionIdHash }
            <RefreshConnectionButton connectionId={ connectionId }/>
        </p>
        : null;
}

export function parseConnectionIdMetadata(connectionId: string) {
    if (!connectionId) return '';
    const [creationTime, id] = connectionId.split('_').slice(-2);
    const diff = new Date().getTime() - parseInt(creationTime);
    return `${ id.slice(-4) } ${ formatTimespan(diff) }`;
}

function formatTimespan(ms: number) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    const minutesStr = minutes % 60;
    const hoursStr = hours % 60;

    if (seconds < 60) return `just now`;
    if (days > 0) return `${ days }days`;

    let result = '~';
    if (hoursStr) result += `${ hoursStr }hrs `;
    if (minutesStr) result += `${ minutesStr }min`;

    return result;
}
