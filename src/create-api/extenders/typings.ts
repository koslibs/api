import type { AxiosRequestConfig } from '../../axios/index.js';

export type RequestConfigExtender<AdditionalParams> = {
    (config: AxiosRequestConfig, params?: AdditionalParams): AxiosRequestConfig;
};
export type ConfigExtendersCollection<T = {}> = RequestConfigExtender<T> & {
    add: <P>(e: RequestConfigExtender<P>) => ConfigExtendersCollection<T & P>;
};
