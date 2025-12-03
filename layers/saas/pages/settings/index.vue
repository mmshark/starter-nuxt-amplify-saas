<script setup lang="ts">
const { workspace } = useWorkspace()
const { isAdminOrOwner } = useWorkspaceMembership()

// Redirect non-admins to members page
watchEffect(() => {
  if (workspace.value && !isAdminOrOwner.value) {
    navigateTo('/settings/members')
  }
})
</script>

<template>
  <UPageCard
    title="General"
    description="Manage your workspace name, description, and other general settings."
  >
    <template #links>
      <UButton
        label="Learn more"
        color="neutral"
        variant="link"
        icon="i-lucide-arrow-right"
        trailing
        to="https://docs.example.com/workspaces"
        target="_blank"
      />
    </template>

    <WorkspaceGeneralForm />
  </UPageCard>
</template>
