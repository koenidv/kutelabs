import { $authStore } from "@clerk/astro/client"
import { PUBLIC_API_BASE_URL } from "astro:env/client"

export async function storeChallengeCompleted(challengeId: string) {
  const token = await $authStore.get().session?.getToken()

  storeChallengeCompletedLocal(challengeId)
  if (token) {
    if (getCompletionSyncStatus()) {
      await syncChallengeCompletion(challengeId, token)
    } else {
      if (await syncAllCompletedChallenges(token)) setCompletionSyncStatus(true)
    }
  } else {
    setCompletionSyncStatus(false)
  }
}

export async function getChallengeCompleted(challengeId: string): Promise<boolean> {
  if (getLocalChallengeCompleted(challengeId)) return true
  const token = await $authStore.get().session?.getToken()
  if (token) {
    return await getRemoteChallengeCompleted(challengeId, token)
  }
  return false
}

export async function getCompletedChallenges(): Promise<string[]> {
  const token = await $authStore.get().session?.getToken() // fixme not yet initialized on page load
  if (token) {
    return await getRemoteCompletedChallenges(token)
  }
  return getLocalCompletedChallenges()
}

//#region local

function storeChallengeCompletedLocal(...challengeIds: string[]) {
  localStorage.setItem(
    "completedChallenges",
    JSON.stringify([...new Set([...getLocalCompletedChallenges(), ...challengeIds])])
  )
}

function getLocalCompletedChallenges(): string[] {
  return JSON.parse(localStorage.getItem("completedChallenges") || "[]")
}

function getLocalChallengeCompleted(challengeId: string): boolean {
  return getLocalCompletedChallenges().includes(challengeId)
}

function setCompletionSyncStatus(synced: boolean) {
  localStorage.setItem("completionSynced", JSON.stringify(synced))
}

function getCompletionSyncStatus(): boolean {
  return JSON.parse(localStorage.getItem("completionSynced") || "false")
}

//#region remote

async function syncChallengeCompletion(challengeId: string, token: string) {
  const res = await fetch(`${PUBLIC_API_BASE_URL}/user/challenge/completed`, {
    method: "post",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ challengeId }),
  })
  if (!res.ok) {
    console.error("Failed to sync challenge completion")
  }
  storeChallengeCompletedLocal(...(await res.json()).completedIds) // 2-way sync is necessary while getting completed challenges on load is not fixed and ssg is used
}

async function syncAllCompletedChallenges(token: string): Promise<boolean> {
  const res = await fetch(`${PUBLIC_API_BASE_URL}/user/challenge/completed/bulk`, {
    method: "post",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ challengeIds: getLocalCompletedChallenges() }),
  })
  if (!res.ok) {
    console.error("Failed to sync all challenge completions")
    return false
  }
  storeChallengeCompletedLocal(...(await res.json()).completedIds)
  return true
}

async function getRemoteCompletedChallenges(token: string): Promise<string[]> {
  const res = await fetch(`${PUBLIC_API_BASE_URL}/user/challenge/completed`, {
    method: "get",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  })
  if (!res.ok) {
    console.error("Failed to get completed challenges")
    return []
  }
  return (await res.json()).map((c: { challengeId: string }) => c.challengeId)
}

async function getRemoteChallengeCompleted(challengeId: string, token: string): Promise<boolean> {
  const res = await fetch(`${PUBLIC_API_BASE_URL}/user/challenge/completed/${challengeId}`, {
    method: "get",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  })
  if (!res.ok) {
    console.error("Failed to get challenge completion")
    return false
  }
  return (await res.json()).completed
}
