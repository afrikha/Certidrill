/**
 * The deployed version: the Git tag of the commit the image was built from
 * (`git describe --tags`), given to the Docker build as APP_VERSION (README,
 * "Version"). "dev" when the build was not given one (local runs, tests).
 */
export function appVersion(value = process.env.APP_VERSION): string {
  const v = value?.trim();
  // A tag, a describe output (v2026.11.23.1-3-gabc1234) or a commit: nothing else is shown.
  return v && /^[\w.+-]{1,64}$/.test(v) ? v : "dev";
}

/** When this server process started: the time of the last deployment (or restart). */
export const STARTED_AT = new Date();
