import Link from "next/link";

interface TabItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 11.5 12 4l8 7.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 10v8.5a1 1 0 0 0 1 1h3.5v-5h3v5H17a1 1 0 0 0 1-1V10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect
        x="4"
        y="5.5"
        width="16"
        height="14.5"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="M4 9.5h16" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M8 3.5v3.5M16 3.5v3.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="8.5" r="2.75" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="16.5" cy="9.5" r="2.1" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M14.8 14.3c2.4.3 4.2 2.1 4.2 4.7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 12a8 8 0 1 1 3.2 6.4L4 20l1.2-3.6A7.96 7.96 0 0 1 4 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FeedIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect
        x="4"
        y="4.5"
        width="16"
        height="6"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <rect
        x="4"
        y="13.5"
        width="16"
        height="6"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="M7.5 7.5h4M7.5 16.5h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="3.3" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M4.5 19.5c0-3.6 3.36-6.5 7.5-6.5s7.5 2.9 7.5 6.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function BottomTabBar({
  loggedIn,
  unreadCount,
}: {
  loggedIn: boolean;
  unreadCount: number;
}) {
  const items: TabItem[] = loggedIn
    ? [
        { href: "/", label: "ホーム", icon: <HomeIcon /> },
        { href: "/events", label: "交流会", icon: <CalendarIcon /> },
        { href: "/members", label: "名簿", icon: <PeopleIcon /> },
        { href: "/feed", label: "フィード", icon: <FeedIcon /> },
        {
          href: "/mypage/matches",
          label: "メッセージ",
          icon: <ChatIcon />,
          badge: unreadCount,
        },
        { href: "/mypage", label: "マイページ", icon: <PersonIcon /> },
      ]
    : [
        { href: "/", label: "ホーム", icon: <HomeIcon /> },
        { href: "/events", label: "交流会", icon: <CalendarIcon /> },
        { href: "/login", label: "ログイン", icon: <PersonIcon /> },
      ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg lg:hidden"
      style={{ boxShadow: "0 -2px 16px rgba(16,25,47,0.06)" }}
    >
      <div className="mx-auto flex max-w-5xl">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-gray-400 transition-colors active:text-primary"
          >
            <span className="relative">
              {item.icon}
              {!!item.badge && item.badge > 0 && (
                <span className="absolute -right-1.5 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-[#241a03]">
                  {item.badge > 9 ? "9+" : item.badge}
                </span>
              )}
            </span>
            <span className="text-[10px] font-semibold">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
