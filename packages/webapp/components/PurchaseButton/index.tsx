'use client';

import { Button } from '@/components/ui/button';
import { loadStripe } from '@stripe/stripe-js';
import { toast } from 'sonner';
import { Plan, Subscription } from 'podverse-utils';

export function PurchaseButton({
  plan,
  existingPlan,
  existingSubscription,
  className,
}: {
  plan: Plan;
  existingPlan: Plan;
  existingSubscription?: Subscription;
  className?: string;
}) {
  const redirectUrl =
    (process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`
      : 'http://localhost:3000') + '/pricing';
  const isPurchase = !existingSubscription;
  const isExisting = plan.id === existingPlan.id;
  const isFree = isExisting && plan.id === 'free';
  const isUpgrade = plan.id !== existingPlan.id && plan.price > existingPlan.price;

  const onClick = async () => {
    if (isPurchase) {
      return redirectToCheckout();
    } else {
      return redirectToPortal();
    }
  };

  const redirectToCheckout = async () => {
    try {
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string);
      if (!stripe) throw new Error('Stripe failed to initialize.');

      const checkoutResponse = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId: plan.priceId, redirectUrl }),
      });
      const body = await checkoutResponse.json();
      if (!checkoutResponse.ok || !body.sessionId) {
        throw new Error(body.error || 'Could not start checkout');
      }
      const result = await stripe.redirectToCheckout({ sessionId: body.sessionId });
      if (result.error) {
        throw new Error(result.error.message || 'Could not start checkout');
      }
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Could not start checkout');
    }
  };

  const redirectToPortal = async () => {
    if (!existingSubscription) {
      console.error('No existing subscription found.');
      return;
    }
    try {
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string);
      if (!stripe) throw new Error('Stripe failed to initialize.');

      const portalResponse = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subscriptionId: existingSubscription.billingProviderId, redirectUrl }),
      });
      const { portalSession } = await portalResponse.json();
      console.log(`Got portal session: ${JSON.stringify(portalSession, null, 2)}`);
      window.location.replace(portalSession.url);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Could not open billing');
    }
  };

  return (
    <Button variant={isUpgrade ? 'default' : 'secondary'} className={className} onClick={onClick} disabled={isFree}>
      {isFree ? 'Current' : isExisting ? 'Manage subscription' : isUpgrade ? 'Upgrade' : 'Downgrade'}
    </Button>
  );
}
