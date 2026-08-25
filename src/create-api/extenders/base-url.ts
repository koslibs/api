import { getBaseApiPath } from '../api-base-path.js';

import { type RequestConfigExtender } from './typings.js';

export const baseUrl = () => {
    const configExtender: RequestConfigExtender<{}> = (config) => ({
        ...config,
        baseURL: getBaseApiPath(),
    });

    return configExtender;
};
