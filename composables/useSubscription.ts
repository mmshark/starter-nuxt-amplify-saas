/**
 * Utility for managing user subscriptions
 * 
 * @returns {Object} Subscription data and methods
 * @property {Ref<Object|null>} activeSubscription - Current active subscription plan
 * @property {Function} fetchActiveSubscription - Fetch current subscription
 * @property {Function} cancelSubscription - Cancel active subscription
 * @property {Function} changePlan - Change subscription plan
 * 
 * @example
 * Basic usage:
 * ```ts
 * const { activeSubscription, fetchActiveSubscription, cancelSubscription, changePlan } = useSubscription();
 * 
 * // Fetch current subscription on mount
 * onMounted(async () => {
 *   await fetchActiveSubscription();
 * });
 * 
 * // Change to a new plan
 * const handlePlanChange = async (newPlanId) => {
 *   const success = await changePlan(newPlanId);
 *   if (success) {
 *     // Plan changed successfully
 *   }
 * };
 * 
 * // Cancel subscription
 * const handleCancel = async () => {
 *   const success = await cancelSubscription();
 *   if (success) {
 *     // Subscription cancelled successfully
 *   }
 * };
 * ```
 */
export const useSubscription = () => {
  const activeSubscription = ref<any>(null);

  // Fetch the current active subscription plan
  const fetchActiveSubscription = async () => {
    try {
      const res = await fetch('/api/subscriptions/active');
      if (!res.ok) {
        throw new Error(`Failed to fetch current plan: ${res.statusText}`);
      }
      const data = await res.json();
      activeSubscription.value = data.status === 200 ? data.body : null;
      return activeSubscription.value;
    } catch (error) {
      console.error("Error fetching current plan:", error);
      activeSubscription.value = null;
      return null;
    }
  };

  // Cancel the active subscription
  const cancelSubscription = async () => {
    try {
      const res = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) {
        console.error(`Cancel subscription failed: ${res.statusText}`);
        return false;
      }
      await fetchActiveSubscription();
      return true;
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      return false;
    }
  };

  // Change the subscription plan
  const changePlan = async (planId: string) => {
    // Avoid changing if already on the requested plan.
    if (activeSubscription.value?.plan === planId) return false;

    try {
      const res = await fetch('/api/subscriptions/change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ planId })
      });
      if (!res.ok) {
        console.error(`Change plan failed: ${res.statusText}`);
        return false;
      }
      await fetchActiveSubscription();
      return true;
    } catch (error) {
      console.error("Error changing plan:", error);
      return false;
    }
  };

  return {
    activeSubscription,
    fetchActiveSubscription,
    cancelSubscription,
    changePlan
  };
};