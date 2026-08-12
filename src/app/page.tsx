import { redirect } from "next/navigation";
import { getCurrentUser, roleHome } from "@/lib/auth/dal";

export default async function RootPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  redirect(user.mustChangePassword ? "/change-password" : roleHome(user.role));
}
