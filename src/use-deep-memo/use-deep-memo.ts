import { useMemo } from 'react';

export const useDeepMemo = <R>(value: R) => {
    const result: R = useMemo(() => value, [JSON.stringify(value)]);

    return result;
};
