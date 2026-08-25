import { type ConfigExtendersCollection, type RequestConfigExtender } from './typings.js';

export const createConfigExtendersCollection = <T>() => {
    const configExtenders: Array<RequestConfigExtender<T>> = [];

    const func: RequestConfigExtender<T> = (axiosConfig, params) => {
        let modifiedConfig = axiosConfig;

        configExtenders.forEach((configExtender) => {
            modifiedConfig = configExtender(modifiedConfig, params);
        });

        return modifiedConfig;
    };

    const result = func as ConfigExtendersCollection<T>;

    result.add = <P>(configExtender: RequestConfigExtender<P>) => {
        configExtenders.push(
            (axiosConfig: import('../../axios/index.js').AxiosRequestConfig, params) =>
                configExtender(axiosConfig, params as P | undefined)
        );

        return result;
    };

    return result;
};
