<template>
  <div class="p-6">
    <Card class="max-w-3xl">
      <template #title>
        <h2 class="text-lg font-medium text-surface-900 dark:text-surface-0">
          Security Settings
        </h2>
      </template>
      <template #content>
        <div class="flex flex-col gap-6">
          <!-- Password Change Section -->
          <div>
            <h3 class="text-lg font-medium mb-2">Change Password</h3>
            <p class="text-surface-500 mb-4">
              Update your password to keep your account secure
            </p>
            <Form
              v-slot="$form"
              :initialValues="passwordValues"
              @submit="onPasswordSubmit"
              class="flex flex-col gap-4"
            >
              <FormField
                v-slot="$field"
                name="currentPassword"
                class="flex flex-col gap-2"
              >
                <label class="text-sm">Current Password</label>
                <Password
                  v-bind="$field.props"
                  toggleMask
                  placeholder="Enter current password"
                  :feedback="false"
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

              <FormField
                v-slot="$field"
                name="newPassword"
                class="flex flex-col gap-2"
              >
                <label class="text-sm">New Password</label>
                <Password
                  v-bind="$field.props"
                  toggleMask
                  placeholder="Enter new password"
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

              <FormField
                v-slot="$field"
                name="confirmPassword"
                class="flex flex-col gap-2"
              >
                <label class="text-sm">Confirm New Password</label>
                <Password
                  v-bind="$field.props"
                  toggleMask
                  placeholder="Confirm new password"
                  :feedback="false"
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

              <Button type="submit" label="Update Password" class="w-fit" />
            </Form>
          </div>

          <!-- MFA Section -->
          <Divider />
          <div>
            <h3 class="text-lg font-medium mb-2">
              Multi-Factor Authentication
            </h3>
            <p class="text-surface-500 mb-4">
              Add an extra layer of security to your account
            </p>
            <div class="flex items-center justify-between">
              <div>
                <h4 class="font-medium">Two-factor authentication</h4>
                <p class="text-sm text-surface-500">
                  Secure your account with TOTP two-factor authentication
                </p>
              </div>
              <Button
                :label="mfaEnabled ? 'Disable MFA' : 'Enable MFA'"
                :severity="mfaEnabled ? 'danger' : 'primary'"
                @click="toggleMFA"
              />
            </div>
          </div>
        </div>
      </template>
    </Card>

    <!-- MFA Setup Dialog -->
    <Dialog
      v-model:visible="showMFADialog"
      modal
      header="Setup MFA"
      :style="{ width: '400px' }"
    >
      <div v-if="qrCode" class="flex flex-col items-center gap-4">
        <Image :src="qrCode" alt="QR Code" width="200" preview />
        <p class="text-sm text-surface-600">
          Scan this QR code with your authenticator app
        </p>
        <div class="flex flex-col gap-2 w-full">
          <label>Verification Code</label>
          <InputText v-model="verificationCode" placeholder="Enter 6-digit code" />
        </div>
      </div>
      <template #footer>
        <Button label="Verify" @click="verifyMFA" />
        <Button
          label="Cancel"
          severity="secondary"
          @click="cancelMFA"
          class="ml-2"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
definePageMeta({
  layout: 'app'
});

// Password form state
const passwordValues = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
});

async function onPasswordSubmit({ values }) {
  if (values.newPassword !== values.confirmPassword) {
    alert("New passwords do not match.");
    return;
  }
  try {
    await updatePassword({
      oldPassword: values.currentPassword,
      newPassword: values.newPassword
    });
    alert("Password updated successfully.");
    // Reset form values
    passwordValues.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    };
  } catch (error) {
    console.error("Error updating password:", error);
    alert("Error updating password.");
  }
}

// MFA state
const mfaEnabled = ref(false);
const showMFADialog = ref(false);
const qrCode = ref(null);
const verificationCode = ref('');

async function toggleMFA() {
  if (mfaEnabled.value) {
    // Handle MFA disable logic here.
    try {
      // Implement MFA disable logic
      mfaEnabled.value = false;
      alert("MFA has been disabled.");
    } catch (error) {
      console.error("Error disabling MFA:", error);
      alert("Error disabling MFA.");
    }
  } else {
    showMFADialog.value = true;
    try {
      // Simulate retrieving a QR code (replace with actual API call)
      qrCode.value = "https://via.placeholder.com/200";
    } catch (error) {
      console.error("Error getting QR code:", error);
      alert("Error getting QR code.");
    }
  }
}

async function verifyMFA() {
  try {
    // Simulate MFA verification; replace with actual logic
    await confirmSignUp({
      confirmationCode: verificationCode.value
    });
    mfaEnabled.value = true;
    showMFADialog.value = false;
    alert("MFA enabled successfully.");
  } catch (error) {
    console.error("Error verifying MFA:", error);
    alert("Error verifying MFA.");
  }
}

function cancelMFA() {
  showMFADialog.value = false;
  verificationCode.value = "";
  qrCode.value = null;
}
</script>