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
