<template>
  <div class="p-6">
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-6 max-w-3xl">
        <!-- Password Change Section -->
        <div class="p-6 bg-surface-0 dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-700">
          <div class="mb-6">
            <h2 class="text-lg font-medium text-surface-900 dark:text-surface-0">Change Password</h2>
            <p class="text-surface-500">Update your password to keep your account secure</p>
          </div>

          <form @submit.prevent="handleUpdatePassword" class="flex flex-col gap-4">
            <div class="flex flex-col gap-2">
              <label class="text-sm text-surface-600 dark:text-surface-400">Current Password</label>
              <Password v-model="currentPassword" toggleMask placeholder="Enter current password" :feedback="false" />
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-sm text-surface-600 dark:text-surface-400">New Password</label>
              <Password v-model="newPassword" toggleMask placeholder="Enter new password" />
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-sm text-surface-600 dark:text-surface-400">Confirm New Password</label>
              <Password v-model="confirmPassword" toggleMask placeholder="Confirm new password" :feedback="false" />
            </div>

            <Button type="submit" label="Update Password" class="w-fit mt-4" />
          </form>
        </div>

        <!-- MFA Section -->
        <div class="p-6 bg-surface-0 dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-700">
          <div class="mb-6">
            <h2 class="text-lg font-medium text-surface-900 dark:text-surface-0">Multi-Factor Authentication</h2>
            <p class="text-surface-500">Add an extra layer of security to your account</p>
          </div>

          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-medium text-surface-900 dark:text-surface-0">Two-factor authentication</h3>
              <p class="text-sm text-surface-500">Secure your account with TOTP two-factor authentication</p>
            </div>
            <Button 
              :label="mfaEnabled ? 'Disable MFA' : 'Enable MFA'" 
              :severity="mfaEnabled ? 'danger' : 'primary'"
              @click="toggleMFA" 
            />
          </div>
        </div>
      </div>
    </div>

    <!-- MFA Setup Dialog -->
    <Dialog v-model:visible="showMFADialog" modal header="Setup MFA" :style="{ width: '400px' }">
      <div v-if="qrCode" class="flex flex-col items-center gap-4">
        <img :src="qrCode" alt="QR Code" class="w-48 h-48" />
        <p class="text-sm text-surface-600">Scan this QR code with your authenticator app</p>
        <div class="flex flex-col gap-2 w-full">
          <label class="text-sm text-surface-600">Enter verification code</label>
          <InputText v-model="verificationCode" placeholder="Enter 6-digit code" />
        </div>
      </div>
      <template #footer>
        <Button label="Verify" @click="verifyMFA" />
        <Button label="Cancel" severity="secondary" @click="cancelMFA" class="ml-2" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { updatePassword, confirmSignUp } from 'aws-amplify/auth'

definePageMeta({
  layout: 'app'
})

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const mfaEnabled = ref(false)
const showMFADialog = ref(false)
const qrCode = ref(null)
const verificationCode = ref('')

async function handleUpdatePassword() {
  if (newPassword.value !== confirmPassword.value) {
    // Show error message - passwords don't match
    return
  }

  try {
    await updatePassword({
      oldPassword: currentPassword.value,
      newPassword: newPassword.value
    })
    // Show success message
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (error) {
    console.error('Error updating password:', error)
    // Show error message
  }
}

async function toggleMFA() {
  if (mfaEnabled.value) {
    // Handle disable MFA
    try {
      // Implement MFA disable logic
      mfaEnabled.value = false
    } catch (error) {
      console.error('Error disabling MFA:', error)
    }
  } else {
    showMFADialog.value = true
    try {
      // Get QR code from backend
      // qrCode.value = await getMFAQRCode()
    } catch (error) {
      console.error('Error getting QR code:', error)
    }
  }
}

async function verifyMFA() {
  try {
    // Verify MFA setup
    await confirmSignUp({
      confirmationCode: verificationCode.value
    })
    mfaEnabled.value = true
    showMFADialog.value = false
  } catch (error) {
    console.error('Error verifying MFA:', error)
  }
}

function cancelMFA() {
  showMFADialog.value = false
  verificationCode.value = ''
  qrCode.value = null
}
</script>
