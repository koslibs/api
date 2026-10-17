import {
    type AxiosRequestConfig,
    type AxiosError,
    type AxiosPromise,
    type CancelToken,
} from '../axios/index.js';
import axios from '../axios/index.js';

import { getBaseApiPath } from './api-base-path.js';
import {
    type ConfigExtendersCollection,
    type RequestConfigExtender,
    createConfigExtendersCollection,
    baseUrl,
    pathExtender,
} from './extenders/index.js';
import { applyGlobalApiExtenders } from './global-extenders.js';

type Api<T> = {
    [X in keyof T]: T[X];
};

export type ApiDeclaration<ParamsData, Endpoint = ''> = {
    (params: ParamsData): AxiosRequestConfig;
    endpoint?: Endpoint;
};

export type ApiRequestDescription = {
    url: string;
    method: string;
    body?: unknown;
    headers: Record<string, string>;
};

type DescribeRequest<Params, AdditionalParams> =
    RequiredKeys<AdditionalParams> extends never
        ? (
              params: Params,
              transportConfig?: TransportConfig & AdditionalParams
          ) => ApiRequestDescription
        : (
              params: Params,
              transportConfig: TransportConfig & AdditionalParams
          ) => ApiRequestDescription;

type ExtractApiResponseType<T> = T extends ApiDeclaration<infer _P, infer D> ? D : unknown;

type ExtractApiParamsType<T> = T extends ApiDeclaration<infer P, infer _D> ? P : unknown;

type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];

type TransportConfig = {
    signal?: AbortSignal;
    cancelToken?: CancelToken;
};

export type Declaration<T, AdditionalParams, Endpoint> =
    RequiredKeys<AdditionalParams> extends never
        ? {
              (
                  params: ExtractApiParamsType<T>,
                  transfortConfig?: TransportConfig & AdditionalParams
              ): AxiosPromise<ExtractApiResponseType<T>>;
              endpoint: Endpoint;
              describeRequest: DescribeRequest<ExtractApiParamsType<T>, AdditionalParams>;
              apiPath?: string;
              apiRelativePath?: string;
              api?: T;
          }
        : {
              (
                  params: ExtractApiParamsType<T>,
                  transfortConfig: TransportConfig & AdditionalParams
              ): AxiosPromise<ExtractApiResponseType<T>>;
              endpoint: Endpoint;
              describeRequest: DescribeRequest<ExtractApiParamsType<T>, AdditionalParams>;
              apiPath?: string;
              apiRelativePath?: string;
              api?: T;
          };

export type ApiServices<T, AdditionalParams = {}> = {
    [X in keyof T]: Declaration<T[X], AdditionalParams, X>;
};

type ApiError = AxiosError;

type InitApiConfig<P> = {
    getConfigExtenders: (extenders: ConfigExtendersCollection) => ConfigExtendersCollection<P>;
};

const initDeclaration = <T, P>(declaration: Api<T>, { getConfigExtenders }: InitApiConfig<P>) => {
    const api = {} as ApiServices<T, P>;

    Object.keys(declaration).forEach((key) => {
        const method = key as keyof T;

        const getRequestConfig = <Params>(
            params: Params,
            { ...transportConfig } = {} as TransportConfig
        ) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
            const declarationFn = declaration[key as keyof typeof declaration] as Function;
            let axiosConfig: AxiosRequestConfig = declarationFn(params);

            axiosConfig = {
                ...axiosConfig,
                ...transportConfig,
            };

            const configExtender = getConfigExtenders(createConfigExtendersCollection());

            axiosConfig = configExtender(axiosConfig, transportConfig as P);

            return axiosConfig;
        };

        const sendRequest = async <Params>(
            params: Params,
            transportConfig = {} as TransportConfig
        ) => {
            const axiosConfig = getRequestConfig(params, transportConfig);

            try {
                return await axios(axiosConfig);
            } catch (error) {
                const errorResult = error as ApiError;

                throw errorResult;
            }
        };

        const service = Object.assign(sendRequest, {
            endpoint: method,
            api: declaration[method],
            describeRequest: <Params>(params: Params, transportConfig = {} as TransportConfig) => {
                const config = getRequestConfig(params, transportConfig);
                const headers = axios.AxiosHeaders.from(
                    config.headers as Parameters<typeof axios.AxiosHeaders.from>[0]
                ).toJSON(true);
                return {
                    url: axios.getUri(config),
                    method: (config.method ?? 'GET').toUpperCase(),
                    body: config.data,
                    headers: Object.fromEntries(
                        Object.entries(headers).map(([name, value]) => [name, String(value)])
                    ),
                };
            },
        }) as Declaration<T[typeof method], P, typeof method>;

        api[method] = service;
    });

    return api;
};

const initApi = <T, P>(declaration: Api<T>, { getConfigExtenders }: InitApiConfig<P>) => {
    return initDeclaration(declaration, {
        getConfigExtenders: (extenders) => getConfigExtenders(extenders),
    });
};

const createApiWithExtenders = <T, P extends object>(
    declaration: Api<T>,
    path: string,
    customExtenders: RequestConfigExtender<P>
) => {
    const optionalSlash = path ? '/' : '';
    const apiPath = `${optionalSlash}${path}`;

    const apiMap = initApi<T, P>(declaration, {
        getConfigExtenders: (extenders) =>
            extenders
                .add(baseUrl())
                .add(pathExtender(apiPath))
                .add(applyGlobalApiExtenders)
                .add(customExtenders),
    });

    Object.entries(apiMap).reduce((agg, nextApi) => {
        const [apiKey, apiValue] = nextApi;

        (apiValue as Declaration<T, {}, P>).apiPath = `${getBaseApiPath()}${apiPath}`;
        (apiValue as Declaration<T, {}, P>).apiRelativePath = apiPath;

        return {
            ...agg,
            [apiKey]: apiValue,
        };
    }, {});

    return apiMap;
};

export type CreateApiOptions<P = {}> = {
    extenders?: (collection: ConfigExtendersCollection) => ConfigExtendersCollection<P>;
};

export const createApi = <T, P extends object = {}>(
    declaration: T,
    path = '',
    options: CreateApiOptions<P> = {}
): ApiServices<T, P> => {
    const local = options.extenders?.(createConfigExtendersCollection());
    const extenders = createConfigExtendersCollection<P>();

    if (local) {
        extenders.add(local);
    }

    return createApiWithExtenders<T, P>(declaration, path, extenders);
};

export { addGlobalApiExtenders } from './global-extenders.js';
