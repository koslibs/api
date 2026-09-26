import assert from 'node:assert/strict';
import test from 'node:test';

import { createApi, addGlobalApiExtenders, setBaseApiPath } from '@koslibs/api';
import { addGlobalApiExtenders as subpathRegister } from '@koslibs/api/create-api';

const declaration = {
    read: () => ({
        url: '/items',
        method: 'GET',
        headers: { Existing: 'preserved' },
        adapter: async (config) => ({
            config,
            data: config,
            status: 200,
            statusText: 'OK',
            headers: {},
        }),
    }),
};

const header = (name, getValue) => (config) => ({
    ...config,
    headers: { ...config.headers, [name]: getValue() },
});

test('legacy createApi preserves paths, metadata and declaration', async () => {
    setBaseApiPath('http://localhost:34121');
    const api = createApi(declaration, 'api/v1');
    const response = await api.read(undefined);
    assert.equal(response.config.url, '/api/v1/items');
    assert.equal(response.config.baseURL, 'http://localhost:34121');
    assert.equal(api.read.endpoint, 'read');
    assert.equal(api.read.api, declaration.read);
    assert.equal(api.read.apiRelativePath, '/api/v1');
    assert.equal(api.read.apiPath, 'http://localhost:34121/api/v1');
});

test('late registration, live state, local override and disposal', async (t) => {
    let profile = '1';
    const api = createApi(declaration, 'api/v1');
    const special = createApi(declaration, 'api/v1', {
        extenders: (collection) => collection.add(header('Profile-Id', () => '99')),
    });
    assert.equal((await api.read()).config.headers.get('Profile-Id'), undefined);
    const dispose = addGlobalApiExtenders((collection) =>
        collection.add(header('Profile-Id', () => profile))
    );
    t.after(dispose);
    assert.equal((await api.read()).config.headers.get('Profile-Id'), '1');
    profile = '2';
    assert.equal((await api.read()).config.headers.get('Profile-Id'), '2');
    const result = await special.read();
    assert.equal(result.config.headers.get('Profile-Id'), '99');
    assert.equal(result.config.headers.get('Existing'), 'preserved');
    dispose();
    dispose();
    assert.equal((await api.read()).config.headers.get('Profile-Id'), undefined);
    assert.equal((await special.read()).config.headers.get('Profile-Id'), '99');
});

test('registration order and independent cleanup', async (t) => {
    assert.equal(subpathRegister, addGlobalApiExtenders);
    const calls = [];
    const first = addGlobalApiExtenders((collection) =>
        collection.add((config) => {
            calls.push('first:' + config.url);
            return config;
        })
    );
    const second = addGlobalApiExtenders((collection) =>
        collection.add((config) => {
            calls.push('second');
            return config;
        })
    );
    t.after(first);
    t.after(second);
    const api = createApi(declaration, 'api/v1', {
        extenders: (collection) =>
            collection.add((config) => {
                calls.push('local');
                return config;
            }),
    });
    await api.read();
    assert.deepEqual(calls, ['first:/api/v1/items', 'second', 'local']);
    calls.length = 0;
    first();
    await api.read();
    assert.deepEqual(calls, ['second', 'local']);
});

test('changes during execution apply to the next request', async (t) => {
    const lateHeader = header('Late', () => 'yes');
    let registered = false;
    let cleanup = () => {};
    const dispose = addGlobalApiExtenders((collection) =>
        collection.add((config) => {
            if (!registered) {
                registered = true;
                cleanup = addGlobalApiExtenders((next) => next.add(lateHeader));
            }
            return config;
        })
    );
    t.after(() => {
        dispose();
        cleanup();
    });
    const api = createApi(declaration);
    assert.equal((await api.read()).config.headers.get('Late'), undefined);
    assert.equal((await api.read()).config.headers.get('Late'), 'yes');
});

test('local parameters and cancellation are preserved', async () => {
    const controller = new AbortController();
    const api = createApi(declaration, '', {
        extenders: (collection) =>
            collection.add((config, params) => {
                assert.equal(params.signal, controller.signal);
                return header('X-Trace', () => params.trace)(config);
            }),
    });
    const result = await api.read(undefined, { trace: 'test', signal: controller.signal });
    assert.equal(result.config.headers.get('X-Trace'), 'test');
    assert.equal(result.config.signal, controller.signal);
});

test('extender failure rejects before transport', async (t) => {
    const failure = new Error('profile unavailable');
    const dispose = addGlobalApiExtenders((collection) =>
        collection.add(() => {
            throw failure;
        })
    );
    t.after(dispose);
    await assert.rejects(createApi(declaration).read(), (error) => error === failure);
});
