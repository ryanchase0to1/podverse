import Link from 'next/link';
import { siteConfig } from '@/config/site';

export function PoweredBy({ link }: { link?: string }) {
  const defaultLink = siteConfig.url;
  return (
    <div className="text-muted-foreground mx-auto text-sm">
      Powered by{' '}
      <Link target="_parent" className="underline" href={link || defaultLink}>
        Podchat Studio
      </Link>
    </div>
  );
}
