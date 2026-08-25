import { type RequestConfigExtender } from './typings.js';

const stripTrailingSlash = (path: string) => {
    if (path.endsWith('/')) {
        return path.substring(0, path.length - 1);
    }

    return path;
};

export const pathExtender = (path: string) => {
    const configExtender: RequestConfigExtender<{}> = (config) => ({
        ...config,
        url: stripTrailingSlash(`${path}${config.url}`),
    });

    return configExtender;
};
