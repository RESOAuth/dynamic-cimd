import { handleRequest } from "./router.js";

export default {
  fetch(request, env) {
    return handleRequest(request, (assetRequest) => env.ASSETS.fetch(assetRequest));
  },
};
