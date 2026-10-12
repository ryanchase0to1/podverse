import stripe from '@/lib/stripe';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseClient } from '@/lib/supabase';
import { PLANS, SubscriptionState } from 'podverse-utils';

/** Record a completed Stripe Checkout session on the signed-in user's account. */
export async function fulfillCheckoutSession(sessionId: string): Promise<void> {
  const { userId } = auth();
  if (!userId) {
    return;
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.client_reference_id !== userId || session.status !== 'complete') {
    return;
  }

  const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
  if (!subscriptionId) {
    return;
  }

  const supabase = await getSupabaseClient();
  const { data: existing, error: existingError } = await supabase
    .from('Subscriptions')
    .select('id')
    .eq('billingProviderId', subscriptionId);
  if (existingError) {
    throw existingError;
  }
  if (existing && existing.length > 0) {
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0]?.price.id;
  const plan = Object.values(PLANS).find((entry) => entry.priceId === priceId);
  if (!plan) {
    throw new Error(`No plan found for price ${priceId}`);
  }

  const email = session.customer_details?.email;
  const { error } = await supabase.from('Subscriptions').insert([
    {
      user: userId,
      plan: plan.id,
      state: SubscriptionState.Active,
      description: email ? `Purchased by ${email}` : 'Purchased',
      billingProviderId: subscriptionId,
      start_time: new Date(subscription.current_period_start * 1000).toISOString(),
      end_time: new Date(subscription.current_period_end * 1000).toISOString(),
    },
  ]);
  if (error) {
    throw error;
  }
}
