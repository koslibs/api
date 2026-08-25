import { type Reducer } from 'react';

import { type AxiosResponse } from '../axios/index.js';

type State<R> = {
    data: R | null;
    initial: boolean;
    loading: boolean;
    error: string | null;
    success: boolean | null;
    cancel: boolean | null;
};

export const initialState = {
    data: null,
    initial: true,
    loading: false,
    error: null,
    success: null,
    cancel: null,
} satisfies State<unknown>;

export type ApiReducer<R> = Reducer<State<R>, ApiActions>;

type FetchAction = { type: 'start' };
type FetchSuccess = { type: 'success'; payload: { response: AxiosResponse } };
type FetchError = { type: 'error'; payload: { error: string } };
type FetchCancel = { type: 'cancel' };
type ResetState = { type: 'reset' };

type ApiActions = FetchSuccess | FetchError | FetchAction | FetchCancel | ResetState;

export const apiReducer = <R>(state: State<R> = initialState, action: ApiActions): State<R> => {
    switch (action.type) {
        case 'start':
            return {
                ...initialState,
                initial: state.initial,
                loading: true,
            };
        case 'success':
            return {
                ...initialState,
                initial: false,
                data: action.payload.response.data as R,
                success: true,
            };
        case 'error':
            return {
                ...state,
                loading: false,
                error: action.payload.error,
                success: false,
            };
        case 'cancel':
            return {
                ...state,
                loading: false,
                success: null,
                error: null,
                cancel: true,
            };
        case 'reset':
            return {
                ...initialState,
            };
        default:
            return state;
    }
};
