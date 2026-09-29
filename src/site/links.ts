/** Where the code and issue tracker live. Update if the repository is renamed. */
export const REPO_URL = 'https://github.com/yohaann196/debate-utils'

export const CORRECTIONS_URL = (name?: string) =>
  `${REPO_URL}/issues/new?template=profile-correction.yml${name ? `&title=${encodeURIComponent(`Profile: ${name}`)}` : ''}`
