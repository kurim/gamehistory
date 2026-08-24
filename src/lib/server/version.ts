import { env } from '$env/dynamic/private';
import pkg from '../../../package.json';

// APP_VERSION is the git commit sha baked into the Docker image at build time
// (see Dockerfile ARG GIT_SHA / .github/workflows/docker-build.yml) — absent
// outside that image (e.g. local `npm run dev`).
const sha = env.APP_VERSION;

export const appVersion = sha ? `${pkg.version} (${sha.slice(0, 7)})` : `${pkg.version} (dev)`;
