'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function PurchaseConfirmation() {
  const params = useSearchParams();
  if (params.get('success') === 'true') {
    return (
      <div className="mb-12 flex w-full flex-col gap-3 border border-white bg-sky-800 p-4 font-mono sm:flex-row sm:items-center sm:justify-between">
        <div>Thanks for subscribing.</div>
        <Link href="/dashboard" className={cn(buttonVariants({ variant: 'secondary' }), 'font-mono')}>
          Return to Podchat
        </Link>
      </div>
    );
  } else if (params.get('canceled') === 'true') {
    return (
      <div className="w-full mb-12 bg-destructive p-4 border-white border font-mono">Your purchase was canceled.</div>
    );
  } else {
    return null;
  }
}
