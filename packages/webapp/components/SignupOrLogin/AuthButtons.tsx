'use client';

import { useEffect, useState } from 'react';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';

/** Clerk UI that only mounts after hydration to avoid server/client mismatches. */
export function AuthButtons({ text }: { text?: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-8 w-8" />;
  }

  return (
    <>
      <SignedIn>
        <UserButton />
      </SignedIn>
      <SignedOut>
        <SignInButton>
          <Button variant="default" className="font-mono">
            {text || 'Sign in'}
          </Button>
        </SignInButton>
      </SignedOut>
    </>
  );
}
