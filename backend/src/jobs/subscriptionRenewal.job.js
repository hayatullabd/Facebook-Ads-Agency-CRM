import { getSubscriptionDashboard, renewSubscriptions } from "../services/subscription.service.js";

const RENEWAL_INTERVAL_MS = 60 * 60 * 1000;
let stopping = true;
let timer = null;
let currentRun = null;

async function runCycle() {
  if (stopping) return;
  try {
    await renewSubscriptions();
  } catch (error) {
    console.error("Subscription renewal job failed:", error?.message || "unknown error");
  }
}

function wake(delay = 0) {
  if (stopping || timer || currentRun) return;
  timer = setTimeout(() => {
    timer = null;
    const run = runCycle().finally(() => {
      if (currentRun === run) currentRun = null;
      if (!stopping) wake(RENEWAL_INTERVAL_MS);
    });
    currentRun = run;
  }, delay);
  timer.unref?.();
}

export function startSubscriptionRenewalJob() {
  if (!stopping) return;
  stopping = false;
  wake();
}

export async function stopSubscriptionRenewalJob() {
  stopping = true;
  if (timer) clearTimeout(timer);
  timer = null;
  await currentRun;
}

export async function getSubscriptionKpis(agencyId) {
  return getSubscriptionDashboard(agencyId);
}
