import React, { useEffect } from 'react';

export const useScrollIntoViewWhenActive = (isActive: boolean, ref: React.RefObject<HTMLDivElement>) => {
    useEffect(() => {
        if (isActive) {
            setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
        }
    }, [isActive, ref]);
}
