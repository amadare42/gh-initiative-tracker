import { ForwardedRef, useImperativeHandle, useRef } from 'react';

export function useForwardedRef<T>(forwardedRef: ForwardedRef<T>) {
    const innerRef = useRef<T>(null);
    useImperativeHandle(forwardedRef, () => innerRef.current!, []);

    return innerRef;
}
