import { env } from 'cloudflare:workers'
import { createExecutionContext } from 'cloudflare:test'
import { http, HttpResponse } from 'msw'
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

it('intercepts a fetch request made in a worker', async () => {
  network.use(
    http.get('http://localhost/resource', () => {
      return HttpResponse.json({ mocked: true })
    }),
  )

  const ctx = createExecutionContext()
  const response = await worker.fetch(
    new Request('http://localhost/') as any,
    env,
    ctx,
  )

  expect.soft(response.status).toBe(200)
  await expect.soft(response.json()).resolves.toEqual({ mocked: true })
})
