import { env } from '$env/dynamic/private';

// APP_VERSION is baked into the Docker image at build time from `git describe`
// (see Dockerfile ARG APP_VERSION / .github/workflows/docker-build.yml):
// a release tag like "v1.2.3" when built from one, "v1.2.3-N-gSHA" for
// commits since the last tag, or a bare short sha if the repo has no tags
// yet. Absent outside that image (e.g. local `npm run dev`).
export const appVersion = env.APP_VERSION || 'dev';
