/** @rstest-environment happy-dom */
import assert from 'node:assert/strict';

import * as apiPackage from '@koslibs/api';
import { afterEach, test } from '@koslibs/builder/rstest';
import axios from 'axios';
import { act, createElement, Fragment, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

const { useApi, createApi } = apiPackage;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const harnesses = new Set();

const createDeferredApi = () => {
    const requests = [];
    const api = Object.assign(
        (_params, config) =>
            new Promise((resolve, reject) => {
                const request = {
                    signal: config.signal,
                    resolve: (data) =>
                        resolve({ data, status: 200, statusText: 'OK', headers: {}, config }),
                    reject,
                };
                requests.push(request);
                const abort = () => reject(new axios.CanceledError('Request canceled'));
                if (config.signal.aborted) abort();
                else config.signal.addEventListener('abort', abort, { once: true });
            }),
        { endpoint: 'read' }
    );
    return { api, requests };
};

const createCallbacks = () => {
    const calls = { success: [], error: [], finally: 0 };
    return {
        calls,
        options: {
            onSuccess: (data) => calls.success.push(data),
            onError: (error) => calls.error.push(error),
            onFinally: () => {
                calls.finally += 1;
            },
        },
    };
};

const mount = async (api, initialOptions = {}, strict = false) => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    let options = initialOptions;
    let current;
    let unmounted = false;

    function Probe() {
        current = useApi(api, options);
        return null;
    }

    const harness = {
        get current() {
            return current;
        },
        async render(nextOptions = options) {
            options = nextOptions;
            await act(async () => {
                root.render(
                    createElement(strict ? StrictMode : Fragment, null, createElement(Probe))
                );
            });
        },
        async unmount() {
            if (unmounted) return;
            unmounted = true;
            await act(async () => root.unmount());
            container.remove();
        },
    };
    harnesses.add(harness);
    await harness.render();
    return harness;
};

const start = async (harness, config) => {
    await act(async () => {
        void harness.current.readFetch({}, config);
    });
};

afterEach(async () => {
    for (const harness of harnesses) await harness.unmount();
    harnesses.clear();
});

test('pending tracks initial loading, failure, retry, success and reset', async () => {
    const { api, requests } = createDeferredApi();
    const harness = await mount(api);

    assert.equal(requests.length, 0);
    assert.equal(harness.current.readLoading, false);
    assert.equal(harness.current.readPending, true);

    await start(harness);
    assert.equal(harness.current.readLoading, true);
    assert.equal(harness.current.readPending, true);

    await act(async () => requests[0].reject(new Error('Connection unavailable')));
    assert.equal(harness.current.readPending, false);

    await act(async () => {
        void harness.current.readRetry();
    });
    assert.equal(harness.current.readPending, true);

    await act(async () => requests[1].resolve('loaded'));
    assert.equal(harness.current.readPending, false);

    await start(harness);
    assert.equal(harness.current.readInitial, false);
    assert.equal(harness.current.readPending, true);

    await act(async () => harness.current.readReset());
    assert.equal(harness.current.readLoading, false);
    assert.equal(harness.current.readPending, true);
});

test('fetchImmediately stays loading through StrictMode cleanup until the live request settles', async () => {
    const { api, requests } = createDeferredApi();
    const { options, calls } = createCallbacks();
    const harness = await mount(api, { ...options, fetchImmediately: true }, true);

    assert.equal(requests.length, 2);
    assert.equal(requests[0].signal.aborted, true);
    assert.equal(requests[1].signal.aborted, false);
    assert.equal(harness.current.readLoading, true);
    assert.equal(harness.current.readError, null);
    assert.equal(harness.current.readCancel, null);
    assert.deepEqual(calls, { success: [], error: [], finally: 0 });

    await act(async () => requests[1].resolve('latest'));
    assert.equal(harness.current.readLoading, false);
    assert.equal(harness.current.readSuccess, true);
    assert.equal(harness.current.readData, 'latest');
    assert.deepEqual(calls, { success: ['latest'], error: [], finally: 1 });
});

test('canceling a superseded request does not stop the new request loading', async () => {
    const { api, requests } = createDeferredApi();
    const { options, calls } = createCallbacks();
    const harness = await mount(api, options);
    await start(harness);
    await start(harness);

    assert.equal(requests[0].signal.aborted, true);
    assert.equal(harness.current.readLoading, true);
    assert.equal(harness.current.readError, null);
    assert.deepEqual(calls, { success: [], error: [], finally: 0 });

    await act(async () => requests[1].resolve('second'));
    assert.deepEqual(calls, { success: ['second'], error: [], finally: 1 });
});

test('canceling the active external signal sets cancel without an error callback', async () => {
    const { api } = createDeferredApi();
    const { options, calls } = createCallbacks();
    const harness = await mount(api, options);
    const controller = new AbortController();
    await start(harness, { signal: controller.signal });
    await act(async () => controller.abort());

    assert.equal(harness.current.readLoading, false);
    assert.equal(harness.current.readPending, false);
    assert.equal(harness.current.readCancel, true);
    assert.equal(harness.current.readError, null);
    assert.equal(harness.current.readSuccess, null);
    assert.deepEqual(calls, { success: [], error: [], finally: 1 });
});

test('a real request failure exposes a structured error to state and callback', async () => {
    const { api, requests } = createDeferredApi();
    const { options, calls } = createCallbacks();
    const harness = await mount(api, options);
    await start(harness);
    await act(async () => requests[0].reject(new Error('Connection unavailable')));

    assert.equal(harness.current.readLoading, false);
    assert.equal(harness.current.readSuccess, false);
    const error = harness.current.readError;
    assert.equal(error.errorMessage, 'Connection unavailable');
    assert.equal(error.errorCode, 'CLIENT_UNKNOWN_ERROR');
    assert.equal(error.type, 'unknown');
    assert.equal(error.status, null);
    assert.deepEqual(calls, { success: [], error: [error], finally: 1 });
    assert.equal(calls.error[0], error);
});

test('useApi preserves the normalized createApi error identity and backend code', async () => {
    const { options, calls } = createCallbacks();
    let directError;
    const api = createApi({
        read: () => ({
            adapter: async (config) => {
                throw new axios.AxiosError(
                    'HTTP failure',
                    'ERR_BAD_REQUEST',
                    config,
                    {},
                    {
                        data: {
                            errorCode: 'PROFILE_BUSY',
                            errorMessage: 'Wait for import or analysis to complete.',
                        },
                        status: 409,
                        statusText: 'Conflict',
                        headers: {},
                        config,
                    }
                );
            },
        }),
    });
    const read = Object.assign(
        async (...args) => {
            try {
                return await api.read(...args);
            } catch (error) {
                directError = error;
                throw error;
            }
        },
        { endpoint: 'read' }
    );
    const harness = await mount(read, options);
    await start(harness);
    assert.ok(harness.current.readError instanceof apiPackage.ApiError);
    assert.equal(harness.current.readError, directError);
    assert.equal(calls.error[0], directError);
    assert.equal(directError.errorCode, 'PROFILE_BUSY');
    assert.equal(directError.status, 409);
    assert.equal(directError.type, 'http');
    assert.equal(calls.finally, 1);
    await act(async () => harness.current.readReset());
    assert.equal(harness.current.readError, null);
});

test('useApi normalizes raw Axios network and timeout failures', async () => {
    for (const [code, expectedCode, type] of [
        ['ERR_NETWORK', 'CLIENT_NETWORK_ERROR', 'network'],
        ['ETIMEDOUT', 'CLIENT_TIMEOUT', 'timeout'],
    ]) {
        const { api, requests } = createDeferredApi();
        const { options, calls } = createCallbacks();
        const harness = await mount(api, options);
        await start(harness);
        await act(async () => requests[0].reject(new axios.AxiosError('Transport failed', code)));
        assert.equal(harness.current.readError.errorCode, expectedCode);
        assert.equal(harness.current.readError.type, type);
        assert.equal(calls.error[0], harness.current.readError);
    }
});

test('a successful HTTP request with a domain failure calls onSuccess', async () => {
    const { api, requests } = createDeferredApi();
    const { options, calls } = createCallbacks();
    const harness = await mount(api, options);
    const data = { status: 'failed', errorCode: 'IMPORT_FAILED', errorMessage: 'Import failed.' };
    await start(harness);
    await act(async () => requests[0].resolve(data));
    assert.equal(harness.current.readData, data);
    assert.equal(harness.current.readError, null);
    assert.equal(harness.current.readSuccess, true);
    assert.deepEqual(calls, { success: [data], error: [], finally: 1 });
});

for (const settlement of ['resolve', 'reject']) {
    test(`an older external request cannot overwrite newer results on ${settlement}`, async () => {
        const { api, requests } = createDeferredApi();
        const { options, calls } = createCallbacks();
        const harness = await mount(api, options);
        await start(harness, { signal: new AbortController().signal });
        await start(harness, { signal: new AbortController().signal });
        await act(async () => requests[1].resolve('newer'));
        await act(async () => {
            if (settlement === 'resolve') requests[0].resolve('older');
            else requests[0].reject(new Error('Older request failed'));
        });

        assert.equal(harness.current.readData, 'newer');
        assert.equal(harness.current.readSuccess, true);
        assert.equal(harness.current.readError, null);
        assert.deepEqual(calls, { success: ['newer'], error: [], finally: 1 });
    });

    test(`reset ignores a late external request ${settlement} and leaves its signal owned by the caller`, async () => {
        const { api, requests } = createDeferredApi();
        const { options, calls } = createCallbacks();
        const harness = await mount(api, options);
        const controller = new AbortController();
        await start(harness, { signal: controller.signal });
        await act(async () => harness.current.readReset());
        await act(async () => {
            if (settlement === 'resolve') requests[0].resolve('stale');
            else requests[0].reject(new Error('Stale failure'));
        });

        assert.equal(controller.signal.aborted, false);
        assert.equal(harness.current.readInitial, true);
        assert.equal(harness.current.readLoading, false);
        assert.equal(harness.current.readData, null);
        assert.equal(harness.current.readError, null);
        assert.equal(harness.current.readCancel, null);
        assert.deepEqual(calls, { success: [], error: [], finally: 0 });
    });

    test(`unmount suppresses callbacks from a late external request ${settlement}`, async () => {
        const { api, requests } = createDeferredApi();
        const { options, calls } = createCallbacks();
        const harness = await mount(api, options);
        await start(harness, { signal: new AbortController().signal });
        await harness.unmount();
        await act(async () => {
            if (settlement === 'resolve') requests[0].resolve('after unmount');
            else requests[0].reject(new Error('After unmount'));
        });

        assert.deepEqual(calls, { success: [], error: [], finally: 0 });
    });
}

test('reset remains reset after its owned request is canceled', async () => {
    const { api, requests } = createDeferredApi();
    const { options, calls } = createCallbacks();
    const harness = await mount(api, options);
    await start(harness);
    await act(async () => harness.current.readReset());

    assert.equal(requests[0].signal.aborted, true);
    assert.equal(harness.current.readInitial, true);
    assert.equal(harness.current.readLoading, false);
    assert.equal(harness.current.readError, null);
    assert.equal(harness.current.readCancel, null);
    assert.deepEqual(calls, { success: [], error: [], finally: 0 });
});

test('the latest callback options are used without restarting a pending request', async () => {
    const { api, requests } = createDeferredApi();
    const first = createCallbacks();
    const second = createCallbacks();
    const harness = await mount(api, { ...first.options, fetchImmediately: true });
    await harness.render({ ...second.options, fetchImmediately: true });
    assert.equal(requests.length, 1);
    await act(async () => requests[0].resolve('result'));

    assert.deepEqual(first.calls, { success: [], error: [], finally: 0 });
    assert.deepEqual(second.calls, { success: ['result'], error: [], finally: 1 });
});
