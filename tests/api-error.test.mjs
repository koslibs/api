import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';

import * as apiPackage from '@koslibs/api';
import { test } from '@koslibs/builder/rstest';
import axios from 'axios';

const { createApi } = apiPackage;
const busy = {
    errorCode: 'PROFILE_BUSY',
    errorMessage: 'Wait for import or analysis to complete.',
};

const failingApi = (failure) =>
    createApi({
        read: () => ({
            adapter: async () => {
                throw failure;
            },
        }),
    });

const assertApiError = (error, expected) => {
    assert.equal(typeof apiPackage.ApiError, 'function');
    assert.ok(error instanceof apiPackage.ApiError);
    assert.ok(error instanceof Error);
    assert.equal(error.name, 'ApiError');
    assert.equal(error.errorCode, expected.errorCode, error.cause?.stack);
    assert.equal(error.errorMessage, expected.errorMessage);
    assert.equal(error.message, expected.errorMessage);
    assert.equal(error.status, expected.status);
    assert.equal(error.type, expected.type);
    return true;
};

test('real HTTP errors preserve backend codes, message and status', async (t) => {
    const server = createServer((_request, response) => {
        response.writeHead(409, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify(busy));
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.onTestFinished(() => new Promise((resolve) => server.close(resolve)));
    const api = createApi({
        read: () => ({ url: `http://127.0.0.1:${server.address().port}/busy` }),
    });
    await assert.rejects(api.read(), (error) =>
        assertApiError(error, { ...busy, status: 409, type: 'http' })
    );
});

test('an Axios response parsing rejection uses the invalid-response client code', async (t) => {
    const server = createServer((_request, response) => {
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end('{broken json');
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.onTestFinished(() => new Promise((resolve) => server.close(resolve)));
    const api = createApi({
        read: () => ({
            url: `http://127.0.0.1:${server.address().port}/broken`,
            responseType: 'json',
            transitional: { silentJSONParsing: false },
        }),
    });
    await assert.rejects(api.read(), (error) =>
        assertApiError(error, {
            errorCode: 'CLIENT_INVALID_RESPONSE',
            errorMessage: 'Invalid error response from server.',
            status: 200,
            type: 'invalid-response',
        })
    );
});

test('a response decoding failure without a response object is not a network failure', async () => {
    const original = new axios.AxiosError('Cannot decode response', 'ERR_BAD_RESPONSE', {}, {});
    await assert.rejects(failingApi(original).read(), (error) =>
        assertApiError(error, {
            errorCode: 'CLIENT_INVALID_RESPONSE',
            errorMessage: 'Invalid response from server.',
            status: null,
            type: 'invalid-response',
        })
    );
});

for (const data of [
    undefined,
    null,
    '',
    '<html>Bad Gateway</html>',
    '{broken json',
    [],
    {},
    { errorCode: 'PROFILE_BUSY' },
    { errorCode: 42, errorMessage: 'Busy' },
    { errorCode: ' ', errorMessage: 'Busy' },
    { errorCode: 'PROFILE_BUSY', errorMessage: '' },
    { errorCode: 'PROFILE_BUSY', errorMessage: 42 },
]) {
    test(`invalid HTTP error body uses a client code: ${JSON.stringify(data)}`, async () => {
        const original = new axios.AxiosError(
            'Request failed with status code 502',
            'ERR_BAD_RESPONSE',
            {},
            {},
            {
                data,
                status: 502,
                statusText: 'Bad Gateway',
                headers: {},
                config: {},
            }
        );
        await assert.rejects(failingApi(original).read(), (error) => {
            assert.equal(error.cause, original);
            return assertApiError(error, {
                errorCode: 'CLIENT_INVALID_RESPONSE',
                errorMessage: 'Invalid error response from server.',
                status: 502,
                type: 'invalid-response',
            });
        });
    });
}

test('server code and message are preserved verbatim even for unrecognized codes', async () => {
    const data = { errorCode: 'FUTURE_BACKEND_CODE', errorMessage: ' Custom explanation. ' };
    const original = new axios.AxiosError(
        'HTTP failure',
        'ERR_BAD_REQUEST',
        {},
        {},
        {
            data,
            status: 422,
            statusText: 'Unprocessable Entity',
            headers: {},
            config: {},
        }
    );
    await assert.rejects(failingApi(original).read(), (error) =>
        assertApiError(error, { ...data, status: 422, type: 'http' })
    );
});

for (const [code, type, errorCode] of [
    ['ERR_NETWORK', 'network', 'CLIENT_NETWORK_ERROR'],
    ['ECONNRESET', 'network', 'CLIENT_NETWORK_ERROR'],
    ['ECONNABORTED', 'timeout', 'CLIENT_TIMEOUT'],
    ['ETIMEDOUT', 'timeout', 'CLIENT_TIMEOUT'],
]) {
    test(`${code} becomes a distinct client ${type} error`, async () => {
        const original = new axios.AxiosError('Transport failed', code, {}, {});
        await assert.rejects(failingApi(original).read(), (error) => {
            assert.equal(error.cause, original);
            return assertApiError(error, {
                errorCode,
                type,
                errorMessage: 'Transport failed',
                status: null,
            });
        });
    });
}

for (const original of [new Error('Local failure'), 'Local failure', null, undefined, {}]) {
    test(`unexpected rejection is normalized: ${String(original)}`, async () => {
        await assert.rejects(failingApi(original).read(), (error) => {
            assert.equal(error.cause, original);
            return assertApiError(error, {
                errorCode: 'CLIENT_UNKNOWN_ERROR',
                type: 'unknown',
                status: null,
                errorMessage:
                    original instanceof Error || typeof original === 'string'
                        ? 'Local failure'
                        : 'Unexpected request error.',
            });
        });
    });
}

test('a declaration failure also rejects with ApiError', async () => {
    const api = createApi({
        read: () => {
            throw new Error('Invalid parameters');
        },
    });
    await assert.rejects(api.read(), (error) =>
        assertApiError(error, {
            errorCode: 'CLIENT_UNKNOWN_ERROR',
            errorMessage: 'Invalid parameters',
            status: null,
            type: 'unknown',
        })
    );
});

test('direct cancellation keeps its identity and Axios cancellation recognition', async () => {
    const canceled = new axios.CanceledError('Canceled');
    await assert.rejects(
        failingApi(canceled).read(),
        (error) => error === canceled && axios.isCancel(error)
    );
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(
        failingApi(new Error('must not run')).read(undefined, { signal: controller.signal }),
        axios.isCancel
    );
    const source = axios.CancelToken.source();
    source.cancel();
    await assert.rejects(
        failingApi(new Error('must not run')).read(undefined, { cancelToken: source.token }),
        axios.isCancel
    );
});

test('HTTP 200 with a failed background import remains a successful Axios response', async () => {
    const data = { status: 'failed', ...busy };
    const api = createApi({
        read: () => ({
            adapter: async (config) => ({
                data,
                status: 200,
                statusText: 'OK',
                headers: {},
                config,
            }),
        }),
    });
    const response = await api.read();
    assert.equal(response.status, 200);
    assert.equal(response.data, data);
});
