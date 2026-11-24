import Link from "next/link";
import { Button } from "./ui/button";
import { getCurrentUser } from "@/lib/auth";
import { LogoutButton } from "./logout-button";

export async function AuthButton() {
  const { userId, email } = await getCurrentUser();

  return userId ? (
    <div className="flex items-center gap-4">
      <span className="text-muted-foreground">{email}</span>
      <LogoutButton />
    </div>
  ) : (
    <div className="flex gap-2">
      <Button asChild size="sm" variant={"outline"}>
        <Link href="/auth/login">Sign in</Link>
      </Button>
      <Button asChild size="sm" variant={"default"}>
        <Link href="/auth/sign-up">Sign up</Link>
      </Button>
    </div>
  );
}
