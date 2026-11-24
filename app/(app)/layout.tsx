import { SiteHeader } from "@/components/site-header";
import { ThemeSwitcher } from "@/components/theme-switcher";

// Shared layout for the signed-in part of the app. The proxy already sends
// signed-out visitors to the login page; each page still checks for itself.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center">
      <SiteHeader />
      <main className="w-full max-w-5xl flex-1 p-5">{children}</main>
      <footer className="flex w-full justify-center border-t py-6">
        <ThemeSwitcher />
      </footer>
    </div>
  );
}
