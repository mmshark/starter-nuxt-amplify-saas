<template>
  <aside
    v-show="!isMobile || isOpen"
    class="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto"
    :class="{
      'fixed inset-0 top-16 z-40 md:relative md:z-auto': isMobile
    }"
  >
    <nav class="p-4">
      <!-- Navigation Groups -->
      <div
        v-for="(group, groupIndex) in items"
        :key="groupIndex"
        class="mb-6 last:mb-0"
      >
        <ul class="space-y-2">
          <li v-for="item in group" :key="item.to || item.label">
            <NuxtLink
              v-if="item.to"
              :to="item.to"
              class="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              active-class="bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 font-medium"
            >
              <UIcon v-if="item.icon" :name="item.icon" class="w-5 h-5" />
              <span>{{ item.label }}</span>
              <UBadge v-if="item.badge" variant="subtle" class="ml-auto">
                {{ item.badge }}
              </UBadge>
            </NuxtLink>

            <button
              v-else-if="item.click"
              class="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
              @click="item.click"
            >
              <UIcon v-if="item.icon" :name="item.icon" class="w-5 h-5" />
              <span>{{ item.label }}</span>
            </button>
          </li>
        </ul>
      </div>
    </nav>

    <!-- Mobile Overlay -->
    <div
      v-if="isMobile && isOpen"
      class="fixed inset-0 bg-black/50 z-30 md:hidden"
      @click="$emit('close')"
    />
  </aside>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const props = defineProps<{
  isOpen?: boolean
  items?: NavigationMenuItem[][]
}>()

const emit = defineEmits<{
  'close': []
}>()

// Responsive behavior
const isMobile = ref(false)
onMounted(() => {
  const checkMobile = () => {
    isMobile.value = window.innerWidth < 768
  }
  checkMobile()
  window.addEventListener('resize', checkMobile)
  onUnmounted(() => window.removeEventListener('resize', checkMobile))
})

// Close sidebar when route changes on mobile
const route = useRoute()
watch(() => route.path, () => {
  if (isMobile.value) {
    emit('close')
  }
})
</script>
