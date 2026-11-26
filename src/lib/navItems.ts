import { LINKS } from './links';
// The site's top-level pages, shared by the desktop sidebar and the mobile menu.
export interface NavItem {
  href: string;
  label: string;
  external?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/',                             label: 'Home' },
  { href: '/projects',                     label: 'Projects' },
  { href: '/books',                        label: 'Books' },
  { href: '/health',                       label: 'Health' },
  { href: LINKS.substack, label: 'Newsletter', external: true },
];

export const isNavActive = (pathname: string | null, item: NavItem) =>
  !item.external && !!pathname && (pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)));
