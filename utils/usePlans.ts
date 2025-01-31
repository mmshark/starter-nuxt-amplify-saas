/**
 * Utility for fetching subscription plans
 * 
 * @returns {Object} Plans data and methods
 * @property {Ref<Array>} plans - Reactive array of fetched plans
 * @property {Ref<boolean>} isLoading - Loading state indicator
 * @property {Ref<string|null>} error - Error message if fetch fails
 * @property {Function} fetchPlans - Method to fetch and filter plans
 * 
 * @example
 * Basic usage:
 * ```ts
 * const { plans, isLoading, error, fetchPlans } = usePlans();
 * 
 * // Fetch all plans
 * await fetchPlans();
 * ```
 * 
 * @example
 * With filters:
 * ```ts
 * const { plans, fetchPlans } = usePlans();
 * 
 * // Fetch non-default plans, sorted by index
 * await fetchPlans({
 *   excludeDefault: true,
 *   sortByIndex: true
 * });
 * 
 * // Fetch plans with custom filter
 * await fetchPlans({
 *   customFilter: (plan) => plan.metadata.type === 'premium'
 * });
 * ```
 */
export const usePlans = () => {
  const plans = ref([]);
  const isLoading = ref(false);
  const error = ref(null);

  const fetchPlans = async (filters?: {
    excludeDefault?: boolean;
    sortByIndex?: boolean;
    customFilter?: (plan: any) => boolean;
  }) => {
    isLoading.value = true;
    error.value = null;
    
    try {
      const res = await fetch('/api/plans');
      const data = await res.json();
      
      if (data.status === 200) {
        let filteredPlans = data.body;

        if (filters?.excludeDefault) {
          filteredPlans = filteredPlans.filter(p => p.metadata["default"] !== "true");
        }

        if (filters?.customFilter) {
          filteredPlans = filteredPlans.filter(filters.customFilter);
        }

        if (filters?.sortByIndex) {
          filteredPlans = filteredPlans.sort((a, b) => 
            parseInt(a.metadata?.index || '0') - parseInt(b.metadata?.index || '0')
          );
        }

        plans.value = filteredPlans || [];
      } else {
        throw new Error(data.body?.error || 'Failed to fetch plans');
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'An error occurred while fetching plans';
      console.error("Error fetching plans:", err);
    } finally {
      isLoading.value = false;
    }
  };

  return {
    plans,
    isLoading,
    error,
    fetchPlans
  };
};