import { inject } from 'vitest'
import { env } from 'cloudflare:workers'
import { createExecutionContext } from 'cloudflare:test'
import { ws } from 'msw'
import { setupNetwork } from '@msw/cloudflare'
import worker from './worker'

const network = setupNetwork()

beforeAll(() => {
  network.configure({
    context: {
      quiet: true,
    },
  })
  network.enable()
})

afterEach(() => {
  network.resetHandlers()
})

afterAll(() => {
  network.disable()
})

it('intercepts a WebSocket connection established in a worker', async () => {
  const api = ws.link('wss://localhost/ws')

  network.use(
    api.addEventListener('connection', ({ client }) => {
      client.send('hello world')
    }),
  )

  const ctx = createExecutionContext()
  const response = await worker.fetch(
    new Request('http://localhost/') as any,
    env,
    ctx,
  )

  expect.soft(response.status).toBe(200)
  await expect
    .soft(response.json())
    .resolves.toEqual({ message: 'hello world' })
})

it('intercepts a WebSocket connection via an upgrade fetch request', async () => {
  const api = ws.link('ws://localhost/ws/websocket-upgrade')

  network.use(
    api.addEventListener('connection', ({ client }) => {
      client.send('hello world')
    }),
  )

  const ctx = createExecutionContext()
  const response = await worker.fetch(
    new Request('http://localhost/websocket-upgrade', {
      headers: {
        upgrade: 'websocket',
      },
    }) as any,
    env,
    ctx,
  )

  expect.soft(response.status).toBe(200)
  await expect
    .soft(response.json())
    .resolves.toEqual({ message: 'hello world' })
})

it('supports forwarding actual WebSocket server events to the worker', async () => {
  const SERVER_HTTP_URL = inject('SERVER_HTTP_URL')
  const SERVER_WS_URL = inject('SERVER_WS_URL')

  const api = ws.link(SERVER_WS_URL)

  network.use(
    api.addEventListener('connection', ({ server, client }) => {
      server.connect()

      server.addEventListener('message', (event) => {
        client.send(event.data)
      })
    }),
  )

  const requestUrl = new URL('http://localhost/websocket-upgrade')
  requestUrl.searchParams.set('target', encodeURIComponent(SERVER_HTTP_URL))

  const ctx = createExecutionContext()
  const response = await worker.fetch(
    new Request(requestUrl, {
      headers: {
        upgrade: 'websocket',
      },
    }) as any,
    env,
    ctx,
  )

  expect.soft(response.status).toBe(200)
  await expect
    .soft(response.json())
    .resolves.toEqual({ message: 'hello from the server!' })
})
