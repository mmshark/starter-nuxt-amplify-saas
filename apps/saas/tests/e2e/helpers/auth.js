import { expect } from '@playwright/test'
import Imap from 'node-imap'
import { simpleParser } from 'mailparser'
import fs from 'fs'
import path from 'path'

// ============================================================================
// User Management
// ============================================================================

import { TestCache } from '../utils/cache.js'
import { Selectors } from '../utils/selectors.js'

// ============================================================================
// Test Data
// ============================================================================


export function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
// Removed TestDataManager dependency; inline minimal data generation below

// ============================================================================
// Gmail Helpers
// ============================================================================

function connectToGmail() {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: process.env.GMAIL_USER || 'test@ontopix.ai',
      password: process.env.GMAIL_APP_PASSWORD || '',
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    })

    imap.once('ready', () => resolve(imap))
    imap.once('error', reject)
    imap.connect()
  })
}

function searchEmails(imap, emailAddress) {
  return new Promise((resolve, reject) => {
    imap.openBox('INBOX', true, (err) => {
      if (err) return reject(err)

      const since = new Date()
      since.setMinutes(since.getMinutes() - 15)

      imap.search([['HEADER', 'TO', emailAddress], ['SINCE', since]], (err2, results) => {
        if (err2) return reject(err2)
        resolve((results || []).slice(-20))
      })
    })
  })
}

function fetchEmail(imap, uid) {
  return new Promise((resolve, reject) => {
    const fetch = imap.fetch(uid, { bodies: '', markSeen: true })
    let emailData = ''

    fetch.on('message', (msg) => {
      msg.on('body', (stream) => {
        stream.on('data', (chunk) => {
          emailData += chunk.toString('utf8')
        })
      })
      msg.once('end', () => {
        simpleParser(emailData, (err, parsed) => {
          if (err) return reject(err)
          resolve(parsed)
        })
      })
    })

    fetch.once('error', reject)
  })
}

function extractCode(email) {
  const content = `${email.subject || ''}\n${email.text || ''}\n${email.html || ''}`
  const match = content.match(/\b(\d{6})\b/)
  return match ? match[1] : null
}

export async function getVerificationCode(emailAddress, timeoutMs = 60000) {
  const start = Date.now()
  let imap = null

  try {
    imap = await connectToGmail()

    while (Date.now() - start < timeoutMs) {
      const uids = await searchEmails(imap, emailAddress)

      for (const uid of uids.slice().reverse()) {
        const email = await fetchEmail(imap, uid)
        const code = extractCode(email)
        if (code) return code
      }

      await wait(4000)
    }

    return null
  } finally {
    if (imap) imap.end()
  }
}

// ============================================================================
// Auth Helpers
// ============================================================================

export class AuthHelpers {
  constructor(page) {
    this.page = page
    this.baseURL = process.env.BASE_URL || 'http://localhost:3000'
  }

  async goto(path) {
    await this.page.goto(`${this.baseURL}${path}`)
  }

  /**
   * Find the first visible selector from a list of candidates
   */
  async findFirstVisibleSelector(selectors, timeout = 10000) {
    for (const selector of selectors) {
      try {
        const element = this.page.locator(selector)
        await element.waitFor({ state: 'visible', timeout: 2000 })
        console.log(`✓ Found element with selector: ${selector}`)
        return element
      } catch (error) {
        console.log(`✗ Selector not found: ${selector}`)
        continue
      }
    }
    throw new Error(`None of the selectors were found: ${selectors.join(', ')}`)
  }

  /**
   * Find element using centralized selectors
   */
  async findElementByCategory(category, name, options = {}) {
    try {
      return await Selectors.findElement(this.page, category, name, options)
    } catch (error) {
      console.log(`✗ Element not found: ${category}.${name}`)
      throw error
    }
  }

  async signup({ email, firstName, lastName, password }, options = {}) {
    const { expectError = false } = options
    console.log(`Starting signup for: ${email} (${firstName} ${lastName})`)

    await this.goto('/auth/signup')
    console.log('Navigated to signup page')

    // Fill form fields using centralized selectors
    try {
      // First Name
      let firstNameInput = await this.findElementByCategory('auth', 'firstNameInput')
      await firstNameInput.fill(firstName)
      console.log('Filled first name')

      // Last Name
      let lastNameInput = await this.findElementByCategory('auth', 'lastNameInput')
      await lastNameInput.fill(lastName)
      console.log('Filled last name')

      // Email
      let emailInput = await this.findElementByCategory('auth', 'emailInput')
      await emailInput.fill(email)
      console.log('Filled email')

      // Password
      let passwordInput = await this.findElementByCategory('auth', 'passwordInput')
      await passwordInput.fill(password)
      console.log('Filled password')

      // Submit button
      let submitButton = await this.findElementByCategory('auth', 'signupSubmitButton')
      await submitButton.click()
      console.log('Clicked submit button')

      // Wait for form submission to complete
      await wait(2000)

      // Check for immediate errors
      const errorSelectors = Selectors.get('auth', 'signupError')
      for (const selector of errorSelectors) {
        try {
          const errorElement = this.page.locator(selector)
          if (await errorElement.isVisible({ timeout: 1000 })) {
            const errorText = await errorElement.textContent()
            console.log(`Signup error detected: ${errorText}`)

            // If we expect an error, just return without throwing
            if (expectError) {
              console.log('Error was expected, continuing...')
              return
            }

            throw new Error(`Signup failed with error: ${errorText}`)
          }
        } catch (e) {
          if (e.message.includes('Signup failed')) {
            throw e
          }
          // Continue checking other selectors
        }
      }

      const currentUrl = this.page.url()
      console.log(`URL after signup submission: ${currentUrl}`)

    } catch (error) {
      console.log(`Error during signup: ${error.message}`)
      if (!expectError) {
        throw error
      }
    }
  }

  async verifyEmail(email) {
    console.log(`Starting email verification for: ${email}`)

    const code = await getVerificationCode(email)
    if (!code) throw new Error('Verification code not found')

    console.log(`Found verification code: ${code}`)

    // Use centralized selectors for verification code input (single, deterministic path)
    const codeSelectors = Selectors.get('auth', 'verificationCodeInput')
    const codeInput = await this.findFirstVisibleSelector(codeSelectors)
    await codeInput.fill(code)

    // Click submit button using centralized selectors
    const submitSelectors = Selectors.get('auth', 'verificationSubmitButton')
    const submitButton = await this.findFirstVisibleSelector(submitSelectors)
    await submitButton.click()
    console.log('Clicked verification submit button')

    // Wait for verification to complete - the toast will be checked by the test
    console.log('Waiting for verification to complete...')
    await wait(2000)

    const finalUrl = this.page.url()
    console.log(`URL after verification: ${finalUrl}`)
  }

  async login({ email, password }, options = {}) {
    const { expectError = false } = options
    console.log(`Starting login for: ${email}`)

    await this.goto('/auth/login')
    console.log('Navigated to login page')

    try {
      // Email field using centralized selectors
      let emailInput = await this.findElementByCategory('auth', 'emailInput')
      await emailInput.fill(email)
      console.log('Filled email')

      // Password field using centralized selectors
      let passwordInput = await this.findElementByCategory('auth', 'passwordInput')
      await passwordInput.fill(password)
      console.log('Filled password')

      // Submit button using centralized selectors
      let submitButton = await this.findElementByCategory('auth', 'loginSubmitButton')
      await submitButton.click()
      console.log('Clicked login button')

      // Wait for login to process
      await wait(3000)

      const currentUrl = this.page.url()
      console.log(`URL after login submission: ${currentUrl}`)

      // Check for login errors using centralized selectors
      const errorSelectors = Selectors.get('auth', 'loginError')
      for (const selector of errorSelectors) {
        try {
          const errorElement = this.page.locator(selector)
          if (await errorElement.isVisible({ timeout: 1000 })) {
            const errorText = await errorElement.textContent()
            console.log(`Login error detected: ${errorText}`)

            // If we expect an error, just return without throwing
            if (expectError) {
              console.log('Error was expected, continuing...')
              return
            }

            throw new Error(`Login failed: ${errorText}. Please check credentials (TEST_USER/TEST_PASS).`)
          }
        } catch (e) {
          if (e.message.includes('Login failed')) {
            throw e
          }
          // Continue checking other selectors
        }
      }

    } catch (error) {
      console.log(`Error during login: ${error.message}`)
      if (!expectError) {
        throw error
      }
    }
  }

  async isLoggedIn() {
    // Wait longer for potential redirects and page loads
    await wait(5000)

    const url = this.page.url()
    console.log(`Current URL after waiting: ${url}`)

    // Check URL is not on auth pages
    const notOnAuthPage = !url.includes('/auth/login') && !url.includes('/auth/signup') && !url.includes('/auth/verify')

    if (!notOnAuthPage) {
      console.log('Still on auth page, not logged in')
      return false
    }

    // Try to find elements that indicate successful login using centralized selectors
    try {
      const authElements = Selectors.get('auth', 'authenticatedElements')
      for (const selector of authElements) {
        try {
          const element = this.page.locator(selector).first()
          if (await element.isVisible({ timeout: 2000 })) {
            console.log(`Found authenticated element: ${selector}`)
            return true
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      // If no specific auth elements found, check if we're on a reasonable page
      const isOnReasonablePage = url.includes('/dashboard') ||
                                 url.includes('/settings') ||
                                 url.includes('/profile') ||
                                 url === this.baseURL ||
                                 url === this.baseURL + '/'

      console.log(`On reasonable page (${url}): ${isOnReasonablePage}`)
      return isOnReasonablePage

    } catch (error) {
      console.log(`Error checking login status: ${error.message}`)
      // Fallback to URL check only
      return notOnAuthPage
    }
  }

  async logout() {
    try {
      const logoutSelectors = Selectors.get('auth', 'logoutButton')
      for (const selector of logoutSelectors) {
        try {
          const logoutButton = this.page.locator(selector).first()
          if (await logoutButton.isVisible({ timeout: 5000 })) {
            await logoutButton.click()
            console.log('Clicked logout button')
            return
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      console.log('No logout button found')
    } catch (e) {
      // Logout not found, ignore
    }
  }

  /**
   * Create a new user with cache support and improved data management
   */
  async createUser(options = { useCache: true }) {
    const cacheKey = 'newly-created-user'

    // Try to use cached user if enabled
    if (options.useCache) {
      const cachedUser = TestCache.get(cacheKey)
      if (cachedUser) {
        console.log(`Using cached user: ${cachedUser.email}`)
        return cachedUser
      }
    }

    // Generate/load user data (env-first unless forceNew)
    const useEnv = !options.forceNew
    const envUser = process.env.TEST_USER
    const envPass = process.env.TEST_PASS
    let userData

    if (useEnv && envUser && envPass) {
      userData = {
        email: envUser,
        password: envPass,
        firstName: 'Test',
        lastName: 'User',
        source: 'environment',
        isReusable: true
      }
    } else {
      const timestamp = Date.now()
      const shortId = timestamp.toString().slice(-6)
      userData = {
        email: `test+signup${shortId}@ontopix.ai`,
        password: 'TestPassword123!',
        firstName: 'Signup',
        lastName: `User${shortId}`,
        source: 'generated',
        isReusable: false,
        createdAt: new Date().toISOString()
      }
    }

    // If using environment user, don't perform signup
    if (userData.source === 'environment') {
      console.log(`Using environment user: ${userData.email}`)
      TestCache.set(cacheKey, userData)
      return userData
    }

    // Perform signup for generated users
    console.log(`Creating new user: ${userData.email}`)
    await this.signup(userData)
    console.log('Signup completed, starting verification')

    await this.verifyEmail(userData.email)
    console.log('Email verification completed')

    // Cache the user for future use
    TestCache.set(cacheKey, userData)
    console.log(`User cached: ${userData.email}`)

    return userData
  }

  /**
   * Get or create journey-specific user data
   */
  // Removed getJourneyUser: flows use TestDataManager + spec-level logic

  /**
   * Enhanced user data preparation with better environment handling
   */
  // Removed prepareUserData: use TestDataManager.createUserData directly
}
