import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function IconProducts(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3.5 8.5 12 4l8.5 4.5v7L12 20l-8.5-4.5v-7Z" />
      <path d="M3.5 8.5 12 13l8.5-4.5M12 13v7" />
    </svg>
  );
}

export function IconDishes(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 12h18a9 9 0 0 1-9 8 9 9 0 0 1-9-8Z" />
      <path d="M8.5 8.5c0-1.5 1-2 1-3.5M12 8c0-1.8 1.2-2.4 1.2-4M15.5 8.5c0-1.5 1-2 1-3.5" />
    </svg>
  );
}

export function IconMeals(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5 3v8a2.5 2.5 0 0 0 5 0V3M7.5 11v10" />
      <path d="M16.5 3c-1.7 1.1-2.5 3-2.5 5.5S15 13 16.5 13s2.5-2 2.5-4.5S18.2 4.1 16.5 3ZM16.5 13v8" />
    </svg>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconPencil(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 20h4l10-10a2.8 2.8 0 0 0-4-4L4 16v4Z" />
      <path d="m13.5 6.5 4 4" />
    </svg>
  );
}

export function IconTrash(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l.8 12.2A1.8 1.8 0 0 0 9.1 21h5.8a1.8 1.8 0 0 0 1.8-1.8L17.5 7" />
      <path d="M10.5 11v6M13.5 11v6" />
    </svg>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

export function IconClose(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}
