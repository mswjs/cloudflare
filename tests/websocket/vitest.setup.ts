import type { TestProject } from 'vitest/node'
import { createTestHttpServer } from '@epic-web/test-server/http'
import { createWebSocketMiddleware } from '@epic-web/test-server/ws'

declare module 'vitest' {
  export interface ProvidedContext {
    SERVER_HTTP_URL: string
    SERVER_WS_URL: string
  }
}

export default async function globalSetup(project: TestProject) {
  const httpServer = await createTestHttpServer()
  const wss = createWebSocketMiddleware({
    server: httpServer,
    pathname: '/ws',
  })

  wss.on('connection', (client) => {
    client.send('hello from the server!')
  })

  project.provide('SERVER_HTTP_URL', httpServer.http.url('/ws').href)
  project.provide('SERVER_WS_URL', wss.ws.url().href)

  return async () => {
    await Promise.allSettled([httpServer.close(), wss.close()])
  }
}
