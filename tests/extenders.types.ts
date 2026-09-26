import {
    createApi,
    addGlobalApiExtenders,
    type ApiDeclaration,
    type RequestConfigExtender,
} from '@koslibs/api';

const read: ApiDeclaration<{ id: number }, { name: string }> = ({ id }) => ({ url: `/${id}` });
const local: RequestConfigExtender<{ trace: string }> = (config) => config;
const api = createApi({ read }, 'api', { extenders: (collection) => collection.add(local) });
api.read({ id: 1 }, { trace: 'test' }).then((response) => {
    const name: string = response.data.name;
    void name;
});
// @ts-expect-error local parameters are required
api.read({ id: 1 });
// @ts-expect-error local parameters cannot be replaced
api.read({ id: 1 }, { profileId: 2 });
// @ts-expect-error declaration inference is preserved
api.read({ id: 'invalid' }, { trace: 'test' });
createApi({ read }).read({ id: 1 });
const dispose: () => void = addGlobalApiExtenders((collection) =>
    collection.add((config) => config)
);
dispose();
// @ts-expect-error global extenders cannot introduce required request parameters
addGlobalApiExtenders((collection) => collection.add(local));
