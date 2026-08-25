import { getBaseApiPath } from './api-base-path.js';
import {
    type AxiosRequestConfig,
    type AxiosError,
    type AxiosPromise,
    type CancelToken,
} from '../axios/index.js';
import {
    type ConfigExtendersCollection,
    createConfigExtendersCollection,
    baseUrl,
    pathExtender,
} from './extenders/index.js';

import axios from '../axios/index.js';

type Api<T> = {
    [X in keyof T]: T[X];
};

export type ApiDeclaration<ParamsData, Endpoint = ''> = {
    (params: ParamsData): AxiosRequestConfig;
    endpoint?: Endpoint;
};

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
              apiPath?: string;
              apiRelativePath?: string;
              api?: T;
          };

type ApiServices<T, AdditionalParams = {}> = {
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

        const sendRequest = async <Params>(
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

export const createApi = <T, P>(declaration: Api<T>, path = '') => {
    const optionalSlash = path ? '/' : '';
    const apiPath = `${optionalSlash}${path}`;

    const apiMap = initApi(declaration, {
        getConfigExtenders: (extenders) => extenders.add(baseUrl()).add(pathExtender(apiPath)),
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
