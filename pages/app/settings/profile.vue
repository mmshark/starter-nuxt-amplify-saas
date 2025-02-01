<template>
  <div class="p-6">
    <Card class="max-w-3xl">
      <template #title>
        <div class="flex items-center gap-4">
          <Avatar :label="avatarInitials" size="xlarge" shape="circle" />
          <div>
            <h2 class="text-lg font-medium text-surface-900 dark:text-surface-0">
              {{ fullName }}
            </h2>
            <p class="text-surface-500">Update your profile details</p>
          </div>
        </div>
      </template>

      <template #content>
        <Form
          v-slot="$form"
          :initialValues="{
            email: email,
            firstName: firstName,
            lastName: lastName
          }"
          @submit="onFormSubmit"
          class="flex flex-col gap-4"
        >
          <FormField v-slot="$field" name="email" class="flex flex-col gap-2">
            <label class="text-sm text-surface-600 dark:text-surface-400">
              Email
            </label>
            <InputText v-bind="$field.props" :modelValue="email" disabled />
          </FormField>

          <FormField v-slot="$field" name="firstName" class="flex flex-col gap-2">
            <label class="text-sm text-surface-600 dark:text-surface-400">
              First Name
            </label>
            <InputText
              v-bind="$field.props"
              :modelValue="firstName"
              placeholder="Enter your first name"
            />
            <Message
              v-if="$field.invalid"
              severity="error"
              size="small"
              variant="simple"
            >
              {{ $field.error?.message }}
            </Message>
          </FormField>

          <FormField v-slot="$field" name="lastName" class="flex flex-col gap-2">
            <label class="text-sm text-surface-600 dark:text-surface-400">
              Last Name
            </label>
            <InputText
              v-bind="$field.props"
              :modelValue="lastName"
              placeholder="Enter your last name"
            />
            <Message
              v-if="$field.invalid"
              severity="error"
              size="small"
              variant="simple"
            >
              {{ $field.error?.message }}
            </Message>
          </FormField>

          <Button
            type="submit"
            label="Save Changes"
            class="w-fit mt-4"
            :loading="loading"
          />
        </Form>
      </template>
    </Card>
  </div>
</template>

<script setup>
definePageMeta({
  layout: 'app'
});

const {
  firstName,
  lastName,
  email,
  loading,
  fullName,
  avatarInitials,
  fetchUser,
  updateUser
} = useUser();

onMounted(fetchUser);

async function onFormSubmit(event) {
  const { values } = event;
  await updateUser({
    firstName: values.firstName,
    lastName: values.lastName
  });
}
</script>