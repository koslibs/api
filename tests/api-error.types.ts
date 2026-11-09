import {
    ApiError,
    type ApiErrorOptions,
    type ApiErrorType,
    type ApiDeclaration,
    createApi,
    useApi,
} from '@koslibs/api';
import type { AxiosPromise } from '@koslibs/api/axios';
import { ApiError as CreateApiError } from '@koslibs/api/create-api';
import { ApiError as HookApiError } from '@koslibs/api/use-api';

const options: ApiErrorOptions = {
    errorCode: 'PROFILE_BUSY',
    errorMessage: 'Wait for import or analysis to complete.',
    status: 409,
    type: 'http',
};
const baseError: Error = new ApiError(options);
const sameClass: typeof ApiError = CreateApiError;
const sameHookClass: typeof ApiError = HookApiError;
void [baseError, sameClass, sameHookClass];

const read: ApiDeclaration<{ id: number }, { name: string }> = ({ id }) => ({ url: `/${id}` });
const api = createApi({ read });
const response: AxiosPromise<{ name: string }> = api.read({ id: 1 });
void response;

function useTypedApi() {
    const result = useApi(api.read, {
        onError(error) {
            error satisfies ApiError;
            error.errorCode satisfies string;
            error.errorMessage satisfies string;
            error.status satisfies number | null;
            error.type satisfies ApiErrorType;
            // @ts-expect-error callbacks receive structured errors, not strings
            error satisfies string;
        },
    });
    result.readError satisfies ApiError | null;
    result.readData satisfies { name: string } | null;
    result.readPending satisfies boolean;
    // @ts-expect-error hook state no longer exposes an error string
    result.readError satisfies string | null;
    useApi(api.read, {
        // @ts-expect-error the old callback signature is a breaking change
        onError: (_message: string) => {},
    });
    return result;
}
void useTypedApi;
