import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { environment } from './environments/environment';

const browserDistFolder = join(import.meta.dirname, '../browser');

/** Origin of the REST API; allowed by the CSP `connect-src`/`img-src`. Override with API_ORIGIN. */
const apiOrigin = (() => {
  try {
    return new URL(process.env['API_ORIGIN'] ?? environment.apiBaseUrl).origin;
  } catch {
    return '';
  }
})();

/**
 * Angular's SSR output contains inline styles (critical CSS) and the inline event-replay /
 * transfer-state scripts, and prerendered pages are static so a per-request nonce is not an option;
 * hence 'unsafe-inline' for script-src/style-src. Everything else is locked to known origins.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
  "font-src 'self' data: https://cdnjs.cloudflare.com",
  `img-src 'self' data: blob: https:`,
  `connect-src 'self' ${apiOrigin}`.trim(),
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const hashedAssetPattern = /[.-][A-Za-z0-9_-]{8}\.(?:js|css|mjs|woff2?|ttf)$/;

const app = express();
const angularApp = new AngularNodeAppEngine();

app.disable('x-powered-by');

/** Security headers (helmet-style, no extra dependency). */
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', contentSecurityPolicy);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  );
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

/**
 * Serve static files from /browser. Content-hashed bundles are cached for a year;
 * everything else (brand images, favicon) is revalidated daily.
 */
app.use(
  express.static(browserDistFolder, {
    index: false,
    redirect: false,
    setHeaders: (res, filePath) => {
      res.setHeader(
        'Cache-Control',
        hashedAssetPattern.test(filePath)
          ? 'public, max-age=31536000, immutable'
          : 'public, max-age=86400',
      );
    },
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
