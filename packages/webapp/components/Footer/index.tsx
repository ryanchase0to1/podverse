import Link from 'next/link';

export function Footer() {
  return (
    <footer>
      <div className="mt-16 w-full border-t font-mono sm:mb-20">
        <div className="mx-auto mb-8 mt-4 flex w-3/5 flex-wrap items-center justify-center gap-8 px-4 py-2 text-center text-sm">
          <div className="text-primary">
            <Link href="mailto:hello@podchatstudio.com">Contact us</Link>
          </div>
          <div className="text-primary">
            <Link href="/privacy">Privacy policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
