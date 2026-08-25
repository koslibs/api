const DEFAULT_BASE_API_PATH = 'http://localhost:34121';

let baseApiPath: string | null = null;

const getEnvBaseApiPath = () => {
    const globalWithProcess = globalThis as typeof globalThis & {
        process?: {
            env?: {
                API_BASE_PATH?: string;
            };
        };
    };

    return globalWithProcess.process?.env?.API_BASE_PATH;
};

export const getBaseApiPath = () => {
    return baseApiPath ?? getEnvBaseApiPath() ?? DEFAULT_BASE_API_PATH;
};

export const setBaseApiPath = (path: string) => {
    baseApiPath = path;
};
