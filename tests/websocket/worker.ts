export default {
  async fetch(req, env, ctx) {
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
  },
} satisfies ExportedHandler<Env>
