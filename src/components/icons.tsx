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
