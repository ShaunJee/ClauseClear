const isGithubActions = process.env.GITHUB_ACTIONS || false;
let repoBasePath = '';

if (isGithubActions) {
  const repo = process.env.GITHUB_REPOSITORY?.replace(/.*?\//, '') || 'ClauseClear';
  repoBasePath = `/${repo}`;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  images: {
    unoptimized: true,
  },
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || repoBasePath,
};

export default nextConfig;
