// Shared logout helper.
//   import { logout } from "@/app/lib/logout";
//   await logout();
// Calls the backend logout (revokes refresh JTI), clears the auth store,
// notifies, and redirects to the login route.

import { authRequest } from "./api";
import { useAuthStore } from "@/app/store/authStore";
import { useNotificationStore } from "@/app/store/notificationStore";

export async function logout() {
  try {
    await authRequest.get("/auth/logout");
  } catch {
    // proceed with local cleanup even if the backend call fails
  }

  useAuthStore.getState().clearAuth();
  useNotificationStore
    .getState()
    .notify("Signed out successfully.", "success", 3000);

  if (typeof window !== "undefined") {
    setTimeout(() => {
      window.location.href = "/auth/login";
    }, 500);
  }
}
