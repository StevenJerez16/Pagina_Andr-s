export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Servir los archivos normales del sitio
    if (request.method === "GET") {
      return env.ASSETS.fetch(request);
    }

    return new Response("Método no permitido", {
      status: 405,
      headers: {
        "Content-Type": "text/plain; charset=utf-8"
      }
    });
  }
};