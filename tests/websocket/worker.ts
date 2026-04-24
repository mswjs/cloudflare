export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)

    if (url.pathname === '/') {
      const ws = new WebSocket('wss://localhost/ws')

      const message = await new Promise<string>((resolve, reject) => {
        ws.addEventListener('message', (event) => {
          resolve(event.data)
        })
        ws.addEventListener('error', () =>
          reject(new Error('WebSocket connection errored')),
        )
      })

      return Response.json({ message })
    }

    if (url.pathname === '/websocket-upgrade') {
      if (request.headers.get('upgrade') !== 'websocket') {
        return new Response('Expected Upgrade: websocket', { status: 426 })
      }

      const targetUrl = decodeURIComponent(
        url.searchParams.get('target') || `wss://localhost/ws${url.pathname}`,
      )

      const { webSocket } = await fetch(targetUrl, {
        headers: request.headers,
      })

      if (!webSocket) {
        return new Response('WebSocket connection failed', { status: 500 })
      }

      webSocket.accept()

      const message = await new Promise<string>((resolve, reject) => {
        webSocket.addEventListener('message', (event) => {
          resolve(event.data)
        })
        webSocket.addEventListener('error', () =>
          reject(new Error('WebSocket connection errored')),
        )
      })

      return Response.json({ message })
    }

    return Response.error()
  },
} satisfies ExportedHandler<Env>
