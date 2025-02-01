import { NavigateOptions } from 'nuxt/app';

interface NavItem {
  label: string;
  icon?: string;
  link?: string;
  subMenu?: NavItem[];
  title?: string;
  description?: string;
}

/**
 * Utility for managing sidebar navigation state and actions
 * 
 * @returns {Object} Sidebar navigation state and methods
 * @property {Ref<NavItem>} selectedNav - Currently selected main navigation item
 * @property {Ref<NavItem|null>} selectedSubNav - Currently selected sub-navigation item
 * @property {Function} setSelectedNav - Updates selected main navigation
 * @property {Function} setSelectedSubNav - Updates selected sub-navigation
 * @property {Function} navigateToItem - Handles navigation for nav items
 * 
 * @example
 * Basic usage:
 * ```ts
 * const { selectedNav, selectedSubNav, setSelectedNav, setSelectedSubNav } = useSidebar();
 * 
 * // Set main navigation item
 * setSelectedNav({
 *   label: 'Dashboard',
 *   icon: 'pi pi-home',
 *   link: '/dashboard'
 * });
 * 
 * // Set sub navigation item
 * setSelectedSubNav({
 *   label: 'Analytics',
 *   link: '/dashboard/analytics'
 * });
 * ```
 */
export const useSidebar = () => {
  const selectedNav = ref<NavItem | null>(null);
  const selectedSubNav = ref<NavItem | null>(null);

  const setSelectedNav = (item: NavItem, emit?: Function) => {
    selectedNav.value = item;
    // Reset sub nav when main nav changes
    if (item.subMenu?.length) {
      selectedSubNav.value = item.subMenu[0];
      emit?.('update:selectedSubNav', item.subMenu[0]);
    } else {
      selectedSubNav.value = null;
      emit?.('update:selectedSubNav', null);
    }
    
    emit?.('update:selectedNav', item);
    
    if (item.link) {
      navigateToItem(item.link);
    }
  };

  const setSelectedSubNav = (item: NavItem, emit?: Function) => {
    selectedSubNav.value = item;
    emit?.('update:selectedSubNav', item);
    
    if (item.link) {
      navigateToItem(item.link);
    }
  };

  const navigateToItem = (link: string, options?: NavigateOptions) => {
    navigateTo(link, options);
  };

  return {
    selectedNav,
    selectedSubNav,
    setSelectedNav,
    setSelectedSubNav,
    navigateToItem
  };
};
