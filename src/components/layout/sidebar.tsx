"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ClipboardList,
  Star,
  BarChart3,
  LogOut,
  Building2,
  Users,
  CalendarRange,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/evaluations", label: "My Evaluations", icon: ClipboardList },
  { href: "/calibration", label: "Calibration", icon: Star },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

const adminOnlyItems = [
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/periods", label: "Periods", icon: CalendarRange },
];

const hrPartnerItems = [
  { href: "/admin/organization", label: "Organization", icon: Building2 },
];

export function Sidebar({ userEmail, isAdmin = false, isHRPartner = false }: {
  userEmail: string;
  isAdmin?: boolean;
  isHRPartner?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  const showAdminSection = isAdmin || isHRPartner;
  const visibleAdminItems = [
    ...(isAdmin ? adminOnlyItems : []),
    ...(isAdmin || isHRPartner ? hrPartnerItems : []),
  ];

  function NavLink({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) {
    const active = pathname === href || pathname.startsWith(href + "/");
    return (
      <Link href={href}
        className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
          active ? "text-white" : "text-white/60 hover:text-white hover:bg-white/10")}
        style={active ? { background: "var(--sidebar-accent)" } : {}}>
        <Icon className="w-4 h-4 flex-shrink-0" />
        {label}
      </Link>
    );
  }

  return (
    <aside className="w-56 flex flex-col" style={{ background: "var(--sidebar)" }}>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <span className="text-lg font-bold text-white tracking-tight">Poclac</span>
        <p className="text-xs mt-0.5" style={{ color: "var(--sidebar-foreground)", opacity: 0.6 }}>
          Performance Platform
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => <NavLink key={item.href} {...item} />)}

        {showAdminSection && (
          <>
            <div className="pt-3 pb-1 px-3">
              <p className="text-xs font-semibold text-white/30 uppercase tracking-wider">
                {isAdmin ? "Admin" : "Management"}
              </p>
            </div>
            {visibleAdminItems.map((item) => <NavLink key={item.href} {...item} />)}
          </>
        )}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="px-3 py-1.5 mb-1">
          <p className="text-xs text-white/50 truncate">{userEmail}</p>
        </div>
        <button onClick={signOut}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors">
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
