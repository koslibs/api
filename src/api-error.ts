import axios from './axios/index.js';

export type ApiErrorType = 'http' | 'network' | 'timeout' | 'invalid-response' | 'unknown';

export type ApiErrorOptions = {
    errorCode: string;
    errorMessage: string;
    status: number | null;
    type: ApiErrorType;
    cause?: unknown;
};

export class ApiError extends Error {
    readonly errorCode: string;
    readonly errorMessage: string;
    readonly status: number | null;
    readonly type: ApiErrorType;

    constructor({ errorCode, errorMessage, status, type, cause }: ApiErrorOptions) {
        super(errorMessage, { cause });
        this.name = 'ApiError';
        this.errorCode = errorCode;
        this.errorMessage = errorMessage;
        this.status = status;
        this.type = type;
    }
}

const isNonblankString = (value: unknown): value is string =>
    typeof value === 'string' && value.trim().length > 0;

export const normalizeApiError = (error: unknown): ApiError => {
    // Cancellation remains recognizable by Axios and never becomes an ApiError.
    if (axios.isCancel(error)) {
        throw error;
    }
    if (error instanceof ApiError) {
        return error;
    }

    const failure = (options: Omit<ApiErrorOptions, 'cause'>) =>
        new ApiError({ ...options, cause: error });
    const message = error instanceof Error ? error.message : error;

    if (axios.isAxiosError<unknown>(error)) {
        if (error.response) {
            const { data, status } = error.response;
            if (
                typeof data === 'object' &&
                data !== null &&
                !Array.isArray(data) &&
                'errorCode' in data &&
                'errorMessage' in data &&
                isNonblankString(data.errorCode) &&
                isNonblankString(data.errorMessage)
            ) {
                return failure({
                    errorCode: data.errorCode,
                    errorMessage: data.errorMessage,
                    status,
                    type: 'http',
                });
            }
            return failure({
                errorCode: 'CLIENT_INVALID_RESPONSE',
                errorMessage: 'Invalid error response from server.',
                status,
                type: 'invalid-response',
            });
        }
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            return failure({
                errorCode: 'CLIENT_TIMEOUT',
                errorMessage: isNonblankString(message) ? message : 'Request timed out.',
                status: null,
                type: 'timeout',
            });
        }
        if (error.code === 'ERR_BAD_RESPONSE') {
            return failure({
                errorCode: 'CLIENT_INVALID_RESPONSE',
                errorMessage: 'Invalid response from server.',
                status: null,
                type: 'invalid-response',
            });
        }
        if (error.code === 'ERR_NETWORK' || error.request) {
            return failure({
                errorCode: 'CLIENT_NETWORK_ERROR',
                errorMessage: isNonblankString(message) ? message : 'Network request failed.',
                status: null,
                type: 'network',
            });
        }
    }

    return failure({
        errorCode: 'CLIENT_UNKNOWN_ERROR',
        errorMessage: isNonblankString(message) ? message : 'Unexpected request error.',
        status: null,
        type: 'unknown',
    });
};
