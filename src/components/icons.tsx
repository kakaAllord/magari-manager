// Small stroke icons (24px grid) used in navigation and buttons.
const paths = {
  dashboard: "M4 13h6V4H4zm10 7h6v-9h-6zM4 20h6v-4H4zm10-11h6V4h-6z",
  inbox: "M4 13h4l2 3h4l2-3h4M5.5 5h13L20 13v6H4v-6z",
  car: "M5 17H3v-5l2-5h14l2 5v5h-2M5 17a2 2 0 1 0 4 0m-4 0a2 2 0 1 1 4 0m6 0a2 2 0 1 0 4 0m-4 0a2 2 0 1 1 4 0M9 17h6M3 12h18",
  users: "M16 20v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1m7-9a4 4 0 1 0 0-8 4 4 0 0 0 0 8m13 9v-1a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  report: "M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zm0 0v6h6M8 17v-3m4 3v-6m4 6v-2",
  money: "M3 7h18v10H3zm9 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4M6 10v4m12-4v4",
  account: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8m-7 9v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9",
  download: "M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2",
  history: "M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5m4-1v5l3 2",
  send: "M22 2 11 13m11-11-7 20-4-9-9-4z",
  chat: "M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12M8 10h8m-8 4h5",
  more: "M5 12a1 1 0 1 0 2 0 1 1 0 0 0-2 0m6 0a1 1 0 1 0 2 0 1 1 0 0 0-2 0m6 0a1 1 0 1 0 2 0 1 1 0 0 0-2 0",
  plus: "M12 5v14M5 12h14",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12m10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6",
  eyeOff: "M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6C3.9 8.4 2 12 2 12s3.5 7 10 7a9.6 9.6 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2",
  key: "M15 7a2 2 0 0 1 2 2m4 0a6 6 0 0 1-7.7 5.7L11 17H9v2H7v2H4a1 1 0 0 1-1-1v-2.6a1 1 0 0 1 .3-.7l6-6A6 6 0 1 1 21 9",
  power: "M12 2v10m6.4-5.4a9 9 0 1 1-12.8 0",
  close: "M18 6 6 18M6 6l12 12",
  filter: "M3 5h18l-7 8v6l-4 2v-8z",
  moneyIn: "M17 7 7 17m0 0h8m-8 0V9",
  moneyOut: "M7 17 17 7m0 0H9m8 0v8",
  wallet: "M3 7a2 2 0 0 1 2-2h13v4M3 7v10a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2m14 7h.01",
  sheet: "M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zm0 0v6h6M8 13h8m-8 4h8m-4-4v4",
  pdf: "M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zm0 0v6h6M9 15h6m-6-3h3",
  receipt: "M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2zm4 5h6m-6 4h6m-6 4h3",
  fuel: "M3 22h12M4 9h10M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18m10-9h2a2 2 0 0 1 2 2v2a2 2 0 0 0 4 0V9.8a2 2 0 0 0-.6-1.4L18 5",
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}

export function BrandMark({ className = "size-8" }: { className?: string }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-lg bg-accent text-accent-fg ${className}`}>
      <Icon name="car" className="size-[60%]" />
    </span>
  );
}
