function base(children: React.ReactNode) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

export function WalletIcon() {
  return base(
    <>
      <path d="M3 7a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v1h-2a3 3 0 0 0 0 6h2v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
      <path d="M17 10.5h2.5a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H17a1.5 1.5 0 0 1 0-3Z" />
    </>
  );
}

export function TrendingUpIcon() {
  return base(
    <>
      <path d="M3 16.5 9.5 10l4 4L21 6.5" />
      <path d="M15 6.5h6v6" />
    </>
  );
}

export function CheckCircleIcon() {
  return base(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.3 2.3L16 10" />
    </>
  );
}

export function CalendarIcon() {
  return base(
    <>
      <rect x="3.5" y="5" width="17" height="16" rx="2.2" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3v3.5" />
      <path d="M16 3v3.5" />
    </>
  );
}
