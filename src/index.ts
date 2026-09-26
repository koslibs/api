export { default as axios } from './axios/index.js';

export {
    createApi,
    addGlobalApiExtenders,
    type CreateApiOptions,
    type ApiServices,
    type ApiDeclaration,
    type Declaration,
} from './create-api/create-api.js';
export { getBaseApiPath, setBaseApiPath } from './create-api/api-base-path.js';

export { useApi } from './use-api/index.js';

export {
    type RequestConfigExtender,
    type ConfigExtendersCollection,
} from './create-api/extenders/index.js';
