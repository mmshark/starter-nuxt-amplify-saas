/**
 * Utility for managing user subscriptions
 * 
 * @returns {Object} Subscription data and methods
 * @property {Ref<Object|null>} currentPlan - Current active subscription plan
 * @property {Function} getCurrentPlan - Fetch current subscription
 * @property {Function} cancelSubscription - Cancel active subscription
 * @property {Function} changePlan - Change subscription plan
 * 
 * @example
 * Basic usage:
 * ```ts
 * const { currentPlan, getCurrentPlan, cancelSubscription, changePlan } = useSubscription();
 * 
 * // Fetch current subscription on mount
 * onMounted(async () => {
 *   await getCurrentPlan();
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
  const currentPlan = ref(null);

  // Get current subscription
  const getCurrentPlan = async () => {
    try {
      const res = await fetch('/api/subscriptions/active');
      const data = await res.json();
      currentPlan.value = data.status === 200 ? data.body : null;
      return currentPlan.value;
    } catch (error) {
      console.error("Error fetching current plan:", error);
      return null;
    }
  };

  // Cancel subscription
  const cancelSubscription = async () => {
    try {
      const res = await fetch('/api/subscriptions/cancel', { method: 'POST' });
      if (res.ok) {
        await getCurrentPlan();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      return false;
    }
  };

  // Change subscription plan
  const changePlan = async (planId: string) => {
    if (currentPlan.value?.plan === planId) return false;
    
    try {
      const res = await fetch('/api/subscriptions/change', {
        method: 'POST',
        body: JSON.stringify({ planId })
      });
      if (res.ok) {
        await getCurrentPlan();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error changing plan:", error);
      return false;
    }
  };

  return {
    currentPlan,
    getCurrentPlan,
    cancelSubscription,
    changePlan
  };
};
