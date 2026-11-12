// Returns the visitor's country code from Netlify's edge geo data, so the
// client can show India-only sections (e.g. "Shop India's Favourite Stores")
// to IN visitors only. Per-request (no-store) so it reflects each visitor's IP.
export default async (request, context) => {
  const code =
    (context && context.geo && context.geo.country && context.geo.country.code) || '';
  return new Response(JSON.stringify({ country: code }), {
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
  });
};

export const config = { path: '/_geo' };
