import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const HUB_HOSTS = new Set([
  'hub.laederdata.com',
  'hub.dev.laederdata.com',
  'hub.staging.laederdata.com',
  'hub.preview.laederdata.com',
  'hub.localhost',
  'hub.127.0.0.1',
]);

export function middleware(request: NextRequest) {
  const hostHeader = request.headers.get('host')?.toLowerCase() ?? '';
  const hostname = hostHeader.split(':')[0];

  if (HUB_HOSTS.has(hostname)) {
    const url = request.nextUrl.clone();
    if (url.pathname !== '/wip') {
      url.pathname = '/wip';
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
