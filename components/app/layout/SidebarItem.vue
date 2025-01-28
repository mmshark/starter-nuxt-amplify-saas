<template>
    <li>
      <!-- Main nav item -->
      <div
        :class="itemClass(isSelected)"
        class="z-30 relative flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all border"
        @click="$emit('click-nav')"
      >
        <i :class="item.icon" />
        <span class="flex-1 font-medium">{{ item.label }}</span>
        <i v-if="item?.subMenu" class="pi pi-chevron-down text-sm leading-none" />
      </div>
  
      <!-- Sub Menu (if any) -->
      <div
        v-if="isSelected && item?.subMenu"
        class="relative pl-1.5 flex flex-col transition-all duration-500 mt-2"
      >
        <template v-for="(subItem, subIndex) of item.subMenu" :key="subIndex">
          <div
            class="cursor-pointer relative px-3.5 py-2 flex items-center transition-all"
            @click.stop="$emit('click-sub-nav', subItem)"
          >
            <!-- You can further factor out the sub-menu lines logic into a separate subcomponent or partial if it is large -->
            <svg
              width="18"
              height="44"
              viewBox="0 0 18 44"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              class="absolute left-4 -top-2"
            >
              <!-- The path for the line connecting sub items -->
              <path
                :d="getLinePath(subIndex, item.subMenu.length)"
                class="stroke-surface-300 dark:stroke-surface-600"
                stroke-width="2"
              />
              <path
                d="M11.136 26.2862L11.1313 26.2863C11.1243 26.2863 11.1174 26.2849 11.1109 26.2823C11.1045 26.2796 11.0986 26.2756 11.0937 26.2707L11.0937 26.2707L11.0917 26.2687C11.0805 26.2575 11.0742 26.2422 11.0742 26.2263C11.0742 26.2105 11.0805 26.1953 11.0917 26.1841C11.0917 26.184 11.0917 26.184 11.0917 26.184L14.4286 22.8471L14.7822 22.4936L14.4286 22.14L11.1009 18.8123C11.0922 18.8014 11.0875 18.7878 11.0877 18.7737C11.088 18.7582 11.0943 18.7434 11.1052 18.7324C11.1162 18.7214 11.131 18.7151 11.1466 18.7149C11.1606 18.7146 11.1743 18.7193 11.1852 18.7281L14.9083 22.4512C14.9195 22.4625 14.9258 22.4777 14.9258 22.4936C14.9258 22.5095 14.9195 22.5247 14.9083 22.5359L11.1758 26.2685L11.1758 26.2685L11.1736 26.2707C11.1687 26.2756 11.1628 26.2796 11.1564 26.2823C11.1499 26.2849 11.143 26.2863 11.136 26.2862Z"
                class="stroke-surface-300 fill-surface-300 dark:stroke-surface-600 dark:fill-surface-600"
              />
              <path
                d="M1 14V17.5C1 20.2614 3.23858 22.5 6 22.5H15"
                class="stroke-surface-300 dark:stroke-surface-600"
                stroke-width="2"
              />
  
              <!-- If the index is the selected sub menu, color lines differently -->
              <template v-if="subIndex === selectedSubIndex">
                <path
                  d="M11.136 26.2862L11.1313 26.2863C11.1243 26.2863 11.1174 26.2849 11.1109 26.2823C11.1045 26.2796 11.0986 26.2756 11.0937 26.2707L11.0937 26.2707L11.0917 26.2687C11.0805 26.2575 11.0742 26.2422 11.0742 26.2263C11.0742 26.2105 11.0805 26.1953 11.0917 26.1841C11.0917 26.184 11.0917 26.184 11.0917 26.184L14.4286 22.8471L14.7822 22.4936L14.4286 22.14L11.1009 18.8123C11.0922 18.8014 11.0875 18.7878 11.0877 18.7737C11.088 18.7582 11.0943 18.7434 11.1052 18.7324C11.1162 18.7214 11.131 18.7151 11.1466 18.7149C11.1606 18.7146 11.1743 18.7193 11.1852 18.7281L14.9083 22.4512C14.9195 22.4625 14.9258 22.4777 14.9258 22.4936C14.9258 22.5095 14.9195 22.5247 14.9083 22.5359L11.1758 26.2685L11.1758 26.2685L11.1736 26.2707C11.1687 26.2756 11.1628 26.2796 11.1564 26.2823C11.1499 26.2849 11.143 26.2863 11.136 26.2862Z"
                  class="stroke-surface-900 fill-surface-900 dark:stroke-surface-0 dark:fill-surface-0"
                />
                <path
                  d="M1 14V17.5C1 20.2614 3.23858 22.5 6 22.5H15"
                  class="stroke-surface-900 dark:stroke-surface-0"
                  stroke-width="2"
                />
              </template>
              <!-- Additional path if subIndex <= selectedSubIndex, etc. -->
              <path
                v-if="subIndex <= selectedSubIndex"
                :d="getActiveLinePath(subIndex, selectedSubIndex)"
                class="stroke-surface-900 dark:stroke-surface-0"
                stroke-width="2"
              />
            </svg>
  
            <!-- Sub item label -->
            <span
              class="leading-relaxed font-medium text-sm transition-all ml-8"
              :class="subItemClass(subItem)"
              >{{ subItem.label }}</span
            >
          </div>
        </template>
      </div>
    </li>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  item: {
    type: Object,
    required: true
  },
  isSelected: {
    type: Boolean,
    default: false
  },
  selectedSubNav: {
    type: String,
    default: null
  }
})

defineEmits(['click-nav', 'click-sub-nav'])

function getLinePath(index, totalItems) {
  if (index === 0) {
    return 'M1 0 V40'
  } else if (index === totalItems - 1) {
    return 'M1 -4 V14'
  } else {
    return 'M1 -4 V40'
  }
}

function getActiveLinePath(index, selectedIndex) {
  if (index === 0) {
    return `M1 0 V${index === selectedIndex ? '14' : '40'}`
  } else if (index === selectedIndex) {
    return 'M1 -4 V14'
  } else {
    return 'M1 -4 V40'
  }
}

const selectedSubIndex = computed(() =>
  props.item?.subMenu
    ? props.item.subMenu.findIndex((sub) => sub.label === props.selectedSubNav)
    : -1
)

const itemClass = (isSelected) =>
  isSelected
    ? 'bg-surface-0 dark:bg-surface-950 text-surface-900 dark:text-surface-0 border-surface shadow-sm'
    : 'border-transparent hover:border-surface-200 dark:hover:border-surface-800 hover:bg-surface-0 dark:hover:bg-surface-950 text-surface-600 dark:text-surface-400'

const subItemClass = (subItem) => {
  return subItem.label === props.selectedSubNav
    ? 'text-surface-900 dark:text-surface-0'
    : 'text-surface-500 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-0'
}
</script>