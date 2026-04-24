export default {
  async fetch(request, env, ctx) {
    return fetch('http://localhost/resource')
  },
} satisfies ExportedHandler<Env>
