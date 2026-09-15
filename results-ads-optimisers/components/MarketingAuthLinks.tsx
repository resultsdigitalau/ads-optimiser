'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function MarketingAuthLinks() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== '/') return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const anchor = target?.closest('a[href="/dashboard"]') as HTMLAnchorElement | null;
      if (!anchor) return;

      event.preventDefault();
      event.stopPropagation();

      const text = (anchor.textContent || '').toLowerCase();
      window.location.href = text.includes('log in') ? '/login' : '/signup';
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [pathname]);

  return null;
}
