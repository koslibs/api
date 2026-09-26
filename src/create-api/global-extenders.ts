import {
    createConfigExtendersCollection,
    type ConfigExtendersCollection,
    type RequestConfigExtender,
} from './extenders/index.js';

const registrations = new Map<symbol, RequestConfigExtender>();

/** Register once at application startup; dispose on cleanup or HMR. */
export const addGlobalApiExtenders = (
    configure: (collection: ConfigExtendersCollection) => ConfigExtendersCollection
): (() => void) => {
    const extender = configure(createConfigExtendersCollection());
    const key = Symbol('global-api-extenders');
    registrations.set(key, extender);

    return () => {
        registrations.delete(key);
    };
};

export const applyGlobalApiExtenders: RequestConfigExtender = (config, params) => {
    // A registration change during execution takes effect on the next request.
    const snapshot = [...registrations.values()];

    return snapshot.reduce((result, extender) => extender(result, params), config);
};
