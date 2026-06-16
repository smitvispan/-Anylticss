export function getMetaGraphApiVersion() {
  return process.env.META_GRAPH_API_VERSION || "v23.0";
}

export function getMetaGraphApiBase() {
  return `https://graph.facebook.com/${getMetaGraphApiVersion()}`;
}

export function getMetaFacebookOauthBase() {
  return `https://www.facebook.com/${getMetaGraphApiVersion()}`;
}
