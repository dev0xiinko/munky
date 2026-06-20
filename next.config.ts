import type { NextConfig } from "next";

// NOTE: We deliberately do NOT use @serwist/next. Its webpack child-compiler
// corrupts the Next 15 production build in this project (intermittent
// "Cannot find module './<chunk>.js'" / RSC prerender crashes). Instead we ship
// a hand-rolled static service worker at public/sw.js, registered manually from
// components/ServiceWorkerRegister.tsx. Same PWA capabilities, reliable builds.
const nextConfig: NextConfig = {};

export default nextConfig;
