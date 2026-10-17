import assert from 'node:assert/strict';

import { addGlobalApiExtenders, axios, createApi, setBaseApiPath } from '@koslibs/api';
import { test } from '@koslibs/builder/rstest';

test('describes requests through the same extenders and serializer without invoking transport', async (t) => {
    let sent = 0;
    let intercepted = 0;
    let current = 'first';
    setBaseApiPath('https://api.example.test');
    const interceptor = axios.interceptors.request.use((config) => {
        intercepted += 1;
        return config;
    });
    const dispose = addGlobalApiExtenders((collection) =>
        collection.add((config) => ({
            ...config,
            headers: { ...config.headers, 'X-Current': current },
        }))
    );
    t.onTestFinished(() => {
        dispose();
        axios.interceptors.request.eject(interceptor);
        setBaseApiPath('http://localhost:34121');
    });
    const api = createApi(
        {
            read: ({ id, query }) => ({
                url: `/${id}`,
                method: 'POST',
                params: { query },
                data: { id },
                adapter: async (config) => {
                    sent += 1;
                    return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
                },
            }),
        },
        'items',
        {
            extenders: (collection) =>
                collection.add((config, { trace }) => ({
                    ...config,
                    headers: { ...config.headers, 'X-Trace': trace },
                    paramsSerializer: {
                        serialize: (params) => `q=${encodeURIComponent(params.query)}`,
                    },
                })),
        }
    );
    const description = api.read.describeRequest({ id: 2, query: 'a b' }, { trace: 'test' });
    assert.deepEqual(description, {
        url: 'https://api.example.test/items/2?q=a%20b',
        method: 'POST',
        body: { id: 2 },
        headers: { 'X-Current': 'first', 'X-Trace': 'test' },
    });
    assert.equal(sent, 0);
    assert.equal(intercepted, 0);
    current = 'second';
    setBaseApiPath('https://other.example.test');
    const next = api.read.describeRequest({ id: 3, query: 'changed' }, { trace: 'next' });
    const response = await api.read({ id: 3, query: 'changed' }, { trace: 'next' });
    assert.equal(next.url, axios.getUri(response.config));
    assert.equal(next.headers['X-Current'], 'second');
    assert.equal(next.headers['X-Trace'], 'next');
    assert.equal(sent, 1);
    assert.equal(intercepted, 1);
});
