import { useCallback, useEffect, useReducer, useRef } from 'react';

import { apiReducer, initialState, type ApiReducer } from './reducer.js';
import axios, { type AxiosPromise } from 'axios';
import { useDeepMemo } from '../use-deep-memo/use-deep-memo.js';

type TransfortConfig = {
    signal?: AbortSignal;
};

type ApiMethodCommon<Endpoint> = {
    endpoint: Endpoint;
};

type ApiMethod<P, R, Endpoint = string, T = TransfortConfig> = {
    (params: P, TransfortConfig?: T): AxiosPromise<R>;
} & ApiMethodCommon<Endpoint>;

type ApiMethodFetch<P, R, Endpoint = string, T = TransfortConfig> = {
    (params?: P, TransfortConfig?: T): AxiosPromise<R>;
} & ApiMethodCommon<Endpoint>;

type BaseResult<P, R, Endpoint extends string> = {
    fetch: ApiMethodFetch<P, R, Endpoint>;
    reset: VoidFunction | null;
    retry: VoidFunction;
    data: R | null;
    initial: boolean;
    loading: boolean;
    error: string | null;
    success: boolean | null;
    cancel: boolean;
};

type UseApiMethodResult<P, R, Endpoint extends string> = {
    [K in keyof BaseResult<P, R, Endpoint> as `${Endpoint}${Capitalize<K>}`]: BaseResult<
        P,
        R,
        Endpoint
    >[K];
};

type UseApiMethodParams<P, R> = {
    onSuccess?: (data: R) => void;
    onError?: (error: string) => void;
    onFinally?: VoidFunction;
    fetchImmediately?: boolean;
    params?: P;
};

export const useApi = <P, R, Endpoint extends string>(
    api: ApiMethod<P, R, Endpoint>,
    options?: UseApiMethodParams<P, R>
): UseApiMethodResult<P, R, Endpoint> => {
    const defaultFetchParams = useDeepMemo(options?.params);

    const mounted = useRef(false);
    const controller = useRef<AbortController | null>(null);
    const [state, dispatch] = useReducer<ApiReducer<R>>(apiReducer, initialState);

    const onSuccess = useRef(options?.onSuccess);
    const onError = useRef(options?.onError);
    const onFinally = useRef(options?.onFinally);
    const fetchImmediately = useRef(options?.fetchImmediately || false);

    onSuccess.current = options?.onSuccess;
    onError.current = options?.onError;
    fetchImmediately.current = Boolean(options?.fetchImmediately);

    const fetch = useCallback(
        async (fetchParams?: P, transfortConfig?: TransfortConfig) => {
            if (!transfortConfig?.signal) {
                controller.current?.abort();
                controller.current = new AbortController();
            }

            const signal = transfortConfig?.signal || controller.current?.signal;

            try {
                dispatch({ type: 'start' });

                const commonFetchParams = fetchParams || defaultFetchParams || ({} as P);
                const commonTransportConfig = { ...transfortConfig, signal };

                const response = await api(commonFetchParams, commonTransportConfig);

                if (!mounted.current) {
                    return;
                }

                dispatch({
                    type: 'success',
                    payload: {
                        response,
                    },
                });

                onSuccess.current?.(response.data);
            } catch (error) {
                if (axios.isCancel(error)) {
                    dispatch({ type: 'cancel' });
                }

                if (!mounted.current) {
                    return;
                }

                dispatch({
                    type: 'error',
                    payload: {
                        error: 'kek',
                    },
                });

                onError.current?.('kek');
            } finally {
                onFinally.current?.();
            }
        },
        [api]
    );

    const reset = useCallback(() => {
        controller.current?.abort();
        dispatch({ type: 'reset' });
    }, []);

    const retry = useCallback(() => fetch(), [fetch]);

    useEffect(() => {
        mounted.current = true;

        return () => {
            mounted.current = false;
            controller.current?.abort();
        };
    }, [mounted]);

    useEffect(() => {
        if (fetchImmediately.current) {
            fetch();
        }
    }, [fetchImmediately.current, fetch]);

    return {
        [`${api.endpoint}Fetch`]: fetch,
        [`${api.endpoint}Reset`]: reset,
        [`${api.endpoint}Retry`]: retry,
        [`${api.endpoint}Data`]: state.data,
        [`${api.endpoint}Initial`]: state.initial,
        [`${api.endpoint}Loading`]: state.loading,
        [`${api.endpoint}Error`]: state.error,
        [`${api.endpoint}Success`]: state.success,
        [`${api.endpoint}Cancel`]: state.cancel,
    } as UseApiMethodResult<P, R, Endpoint>;
};
