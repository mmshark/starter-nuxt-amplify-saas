import { Amplify } from 'aws-amplify';
import outputs from '../amplify_outputs.json';
import { fetchAuthSession } from 'aws-amplify/auth';

export default defineNuxtRouteMiddleware(async (to) => {
  if (process.server) return;

  Amplify.configure(outputs);
  
  const session = await fetchAuthSession();

  if (!session.tokens) {
    return navigateTo(`/app/auth?s=signIn&redirect=${to.fullPath}`)
  }
})