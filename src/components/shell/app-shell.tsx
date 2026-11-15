"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeftRight,
  Bell,
  ChevronsLeft,
  ChevronsRight,
  CircleAlert,
  LayoutGrid,
  LogOut,
  Package,
  Plus,
  PlusCircle,
  ShieldCheck,
  Store,
  UserRound,
} from "lucide-react";

import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";

import { Logo } from "./logo";

export interface ShellPharmacy {
  id: string;
  pharmacy_name: string;
  owner_name: string;
  is_verified: boolean;
  governorate: string;
  city: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutGrid;
  tab?: string;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function AppShell({
  pharmacy,
  pendingCount,
  localMode,
  children,
}: {
  pharmacy: ShellPharmacy | null;
  pendingCount: number;
  localMode: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab");
  const [collapsed, setCollapsed] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem("ps_sidebar") === "collapsed");
    } catch {
      /* ignore */
    }
  }, []);

  const toggleSidebar = () => {
    setCollapsed((value) => {
      const next = !value;
      try {
        window.localStorage.setItem("ps_sidebar", next ? "collapsed" : "expanded");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  useEffect(() => {
    setAccountOpen(false);
  }, [pathname]);

  const sections: NavSection[] = [
    {
      title: "السوق",
      items: [
        { href: "/market", label: "السوق الحي", icon: LayoutGrid },
        {
          href: "/market?tab=SHORTAGE_REQUEST",
          label: "مطلوب نواقص",
          icon: CircleAlert,
          tab: "SHORTAGE_REQUEST",
        },
      ],
    },
    {
      title: "مخزني",
      items: [
        { href: "/listings/new", label: "عرض / طلب جديد", icon: PlusCircle },
        { href: "/dashboard", label: "عروضي وطلباتي", icon: Package },
      ],
    },
    {
      title: "التبادلات",
      items: [
        {
          href: "/dashboard/swaps",
          label: "عروض البدل",
          icon: ArrowLeftRight,
          badge: pendingCount,
        },
      ],
    },
  ];

  const isActive = (item: NavItem) => {
    if (item.tab) return pathname === "/market" && activeTab === item.tab;
    if (item.href === "/market") return pathname === "/market" && !activeTab;
    if (item.href === "/dashboard") return pathname === "/dashboard";
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  const accountMenu = pharmacy ? (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAccountOpen((value) => !value)}
        aria-expanded={accountOpen}
        aria-haspopup="menu"
        className="flex h-9 items-center gap-2 rounded-md border border-line bg-surface ps-1.5 pe-2 transition-colors hover:border-line-strong hover:bg-sunken"
      >
        <span className="grid size-6 place-items-center rounded-sm bg-brand-soft font-display text-[10px] font-bold text-brand-ink ring-1 ring-brand-line">
          {initials(pharmacy.pharmacy_name)}
        </span>
        <span className="hidden max-w-[130px] truncate text-[12px] font-semibold text-ink sm:block">
          {pharmacy.pharmacy_name}
        </span>
        <ChevronsLeft size={14} className="text-ink-faint" aria-hidden />
      </button>

      {accountOpen && (
        <>
          <button
            type="button"
            aria-label="إغلاق القائمة"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setAccountOpen(false)}
          />
          <div
            role="menu"
            className="absolute end-0 top-[calc(100%+6px)] z-50 w-[268px] animate-rise overflow-hidden rounded-md border border-line bg-surface shadow-raised"
          >
            <div className="border-b border-line bg-canvas px-3.5 py-3">
              <div className="flex items-center gap-2">
                <span className="truncate text-[13px] font-bold text-ink">{pharmacy.pharmacy_name}</span>
                {pharmacy.is_verified && (
                  <span className="chip border-brand-line bg-brand-soft text-brand-ink">
                    <ShieldCheck size={11} strokeWidth={2} aria-hidden />
                    موثقة
                  </span>
                )}
              </div>
              <p className="mt-0.5 truncate text-[11px] text-ink-muted">
                {pharmacy.governorate} · {pharmacy.city}
              </p>
            </div>
            <div className="p-1.5">
              <MenuLink href="/dashboard" icon={Package} label="لوحة التحكم" />
              <MenuLink href="/listings/new" icon={PlusCircle} label="نشر عرض جديد" />
              <MenuLink href="/dashboard/swaps" icon={ArrowLeftRight} label="عروض البدل" />
              <MenuLink href="/profile" icon={UserRound} label="ملف الصيدلية" />
            </div>
            <form action="/api/session/logout" method="post" className="border-t border-line p-1.5">
              <button
                type="submit"
                className="flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-[12px] font-medium text-crimson transition-colors hover:bg-crimson-soft"
              >
                <LogOut size={14} strokeWidth={1.75} aria-hidden />
                تسجيل الخروج
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  ) : (
    <Link href="/login" className="btn btn-outline btn-sm h-9">
      <UserRound size={14} strokeWidth={1.75} aria-hidden />
      دخول الصيدليات
    </Link>
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:start-3 focus:top-3 focus:z-50 focus:rounded-sm focus:bg-surface focus:px-3 focus:py-2 focus:text-sm"
      >
        تجاوز إلى المحتوى
      </a>

      <header className="sticky top-0 z-40 border-b border-line bg-surface">
        <div className="mx-auto flex h-[57px] w-full max-w-[1680px] items-center gap-3 px-3 sm:px-5">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={toggleSidebar}
              className="hidden size-8 place-items-center rounded-sm text-ink-muted transition-colors hover:bg-sunken hover:text-ink lg:grid"
              aria-label={collapsed ? "توسيع القائمة" : "تصغير القائمة"}
              title={collapsed ? "توسيع القائمة" : "تصغير القائمة"}
            >
              {collapsed ? (
                <ChevronsLeft size={16} aria-hidden />
              ) : (
                <ChevronsRight size={16} aria-hidden />
              )}
            </button>
            <span className="hidden h-6 w-px bg-line lg:block" />
            <Logo />
          </div>

          <div className="ms-auto flex items-center gap-1.5 sm:gap-2">
            <span className="hidden items-center gap-1.5 rounded-sm border border-brand-line bg-brand-soft px-2 py-1 text-[10.5px] font-semibold text-brand-ink md:inline-flex">
              <span className="size-1.5 rounded-full bg-brand" aria-hidden />
              السوق متاح الآن
            </span>

            <Link
              href="/listings/new"
              className="btn btn-primary btn-sm hidden h-9 md:inline-flex"
            >
              <Plus size={15} strokeWidth={2} aria-hidden />
              عرض جديد
            </Link>

            <Link
              href="/listings/new"
              className="grid size-9 place-items-center rounded-sm border border-line text-ink-secondary transition-colors hover:bg-sunken hover:text-ink md:hidden"
              aria-label="عرض جديد"
            >
              <Plus size={16} aria-hidden />
            </Link>

            <Link
              href="/dashboard/swaps"
              className="relative grid size-9 place-items-center rounded-sm border border-line text-ink-secondary transition-colors hover:bg-sunken hover:text-ink"
              aria-label={`عروض البدل${pendingCount ? ` — ${pendingCount} جديدة` : ""}`}
            >
              <Bell size={16} strokeWidth={1.75} aria-hidden />
              {pendingCount > 0 && (
                <span className="num absolute -end-1 -top-1 grid min-w-4 place-items-center rounded-full border border-surface bg-crimson px-1 text-[9px] font-bold leading-4 text-white">
                  {pendingCount}
                </span>
              )}
            </Link>

            <span className="mx-0.5 hidden h-6 w-px bg-line sm:block" />

            {accountMenu}
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1680px] flex-1 items-stretch">
        <aside
          className={cn(
            "sticky top-[57px] hidden h-[calc(100dvh-57px)] shrink-0 flex-col border-e border-line bg-surface lg:flex",
            collapsed ? "w-[68px]" : "w-[236px]",
          )}
        >
          <nav className="flex-1 overflow-y-auto px-2.5 py-4">
            {sections.map((section) => (
              <div key={section.title} className="mb-4 last:mb-0">
                {!collapsed && (
                  <p className="mb-1.5 px-2.5 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                    {section.title}
                  </p>
                )}
                <ul className="space-y-0.5">
                  {section.items.map((item) => {
                    const active = isActive(item);
                    const Icon = item.icon;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          title={collapsed ? item.label : undefined}
                          className={cn(
                            "group relative flex h-9 items-center gap-2.5 rounded-sm border-s-2 text-[12.5px] transition-colors",
                            collapsed ? "justify-center px-0" : "px-2.5",
                            active
                              ? "border-brand bg-brand-soft font-semibold text-brand-ink"
                              : "border-transparent text-ink-secondary hover:bg-sunken hover:text-ink",
                          )}
                        >
                          <Icon
                            size={16}
                            strokeWidth={1.75}
                            className={cn(active ? "text-brand" : "text-ink-muted")}
                            aria-hidden
                          />
                          {!collapsed && <span className="truncate">{item.label}</span>}
                          {!collapsed && item.badge ? (
                            <span className="num ms-auto grid min-w-[18px] place-items-center rounded-full bg-crimson px-1 text-[10px] font-bold leading-[18px] text-white">
                              {item.badge}
                            </span>
                          ) : null}
                          {collapsed && item.badge ? (
                            <span className="absolute end-1.5 top-1.5 size-1.5 rounded-full bg-crimson" />
                          ) : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}

            <div className="mt-2 border-t border-line pt-3">
              <Link
                href="/profile"
                title={collapsed ? "ملف الصيدلية" : undefined}
                className={cn(
                  "flex h-9 items-center gap-2.5 rounded-sm border-s-2 border-transparent text-[12.5px] text-ink-secondary transition-colors hover:bg-sunken hover:text-ink",
                  collapsed ? "justify-center" : "px-2.5",
                )}
              >
                <Store size={16} strokeWidth={1.75} className="text-ink-muted" aria-hidden />
                {!collapsed && <span>ملف الصيدلية</span>}
              </Link>
              {pharmacy ? (
                <Link
                  href="/profile"
                  className={cn(
                    "mt-2 flex items-center gap-2 rounded-sm bg-canvas p-2 ring-1 ring-line transition-colors hover:ring-line-strong",
                    collapsed && "justify-center",
                  )}
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-sm bg-brand text-[10px] font-bold text-white">
                    {initials(pharmacy.pharmacy_name)}
                  </span>
                  {!collapsed && (
                    <span className="min-w-0">
                      <span className="block truncate text-[11.5px] font-semibold text-ink">
                        {pharmacy.pharmacy_name}
                      </span>
                      <span className="block truncate text-[10px] text-ink-muted">
                        {pharmacy.city} · {pharmacy.is_verified ? "موثقة" : "قيد التوثيق"}
                      </span>
                    </span>
                  )}
                </Link>
              ) : (
                <Link
                  href="/login"
                  className={cn(
                    "mt-2 flex items-center gap-2 rounded-sm bg-canvas p-2 ring-1 ring-line transition-colors hover:ring-line-strong",
                    collapsed && "justify-center",
                  )}
                >
                  <UserRound size={15} className="text-ink-muted" aria-hidden />
                  {!collapsed && (
                    <span className="text-[11.5px] font-semibold text-ink">تسجيل الدخول</span>
                  )}
                </Link>
              )}
            </div>
          </nav>

          <div className="border-t border-line px-3 py-2.5">
            <div className={cn("flex items-center gap-1.5", collapsed && "justify-center")}>
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  localMode ? "bg-amber" : "bg-brand",
                )}
                aria-hidden
              />
              {!collapsed && (
                <span className="text-[9.5px] font-medium tracking-wide text-ink-faint">
                  {localMode ? "وضع محلي · بيانات على الجهاز" : "متصل بـ Supabase"}
                </span>
              )}
            </div>
          </div>
        </aside>

        <main id="main" className="min-w-0 flex-1 pb-[76px] lg:pb-6">
          {children}
        </main>
      </div>

      <MobileNav
        pathname={pathname}
        activeTab={activeTab}
        pendingCount={pendingCount}
        authenticated={Boolean(pharmacy)}
      />
    </div>
  );
}

function MenuLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof Package;
  label: string;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      className="flex items-center gap-2 rounded-sm px-2.5 py-2 text-[12px] font-medium text-ink-secondary transition-colors hover:bg-sunken hover:text-ink"
    >
      <Icon size={14} strokeWidth={1.75} className="text-ink-muted" aria-hidden />
      {label}
    </Link>
  );
}

function MobileNav({
  pathname,
  activeTab,
  pendingCount,
  authenticated,
}: {
  pathname: string;
  activeTab: string | null;
  pendingCount: number;
  authenticated: boolean;
}) {
  const items = [
    { href: "/market", label: "السوق", icon: LayoutGrid, active: pathname === "/market" && !activeTab },
    {
      href: "/market?tab=SHORTAGE_REQUEST",
      label: "النواقص",
      icon: CircleAlert,
      active: pathname === "/market" && activeTab === "SHORTAGE_REQUEST",
    },
    { href: "/listings/new", label: "عرض", icon: Plus, active: pathname === "/listings/new", primary: true },
    {
      href: "/dashboard/swaps",
      label: "البدل",
      icon: ArrowLeftRight,
      active: pathname.startsWith("/dashboard/swaps"),
      badge: pendingCount,
    },
    {
      href: authenticated ? "/dashboard" : "/login",
      label: authenticated ? "حسابي" : "دخول",
      icon: UserRound,
      active: pathname.startsWith("/dashboard") || pathname === "/login",
    },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
      <ul className="grid h-[62px] grid-cols-5">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.label}>
              <Link
                href={item.href}
                className={cn(
                  "relative flex h-full flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors",
                  item.active ? "text-brand" : "text-ink-muted",
                )}
              >
                {item.active && (
                  <span className="absolute inset-x-5 top-0 h-[2px] bg-brand" aria-hidden />
                )}
                {item.primary ? (
                  <span className="grid size-8 place-items-center rounded-sm bg-brand text-white">
                    <Icon size={17} strokeWidth={2} aria-hidden />
                  </span>
                ) : (
                  <span className="relative grid size-7 place-items-center">
                    <Icon size={18} strokeWidth={1.75} aria-hidden />
                    {item.badge ? (
                      <span className="num absolute -end-1.5 -top-0.5 grid min-w-3.5 place-items-center rounded-full bg-crimson px-0.5 text-[8px] font-bold leading-[14px] text-white">
                        {item.badge}
                      </span>
                    ) : null}
                  </span>
                )}
                <span className={cn(item.primary && "-mt-0.5")}>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
