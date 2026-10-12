import { hubspot } from "@hubspot/ui-extensions";

export default async function hsFetch(url, options = {}) {
  // Keep headers untouched; HubSpot may reject non-Authorization headers.
  return hubspot.fetch(url, options);
}
