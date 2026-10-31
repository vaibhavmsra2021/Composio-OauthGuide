// Small inline icon set (Lucide-style strokes) so pages need no icon dependency.
type P = { size?: number };
const base = (size = 16) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const Search = ({ size }: P) => (
  <svg {...base(size)}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);
export const Chevron = ({ size }: P) => (
  <svg {...base(size)}><path d="m9 18 6-6-6-6" /></svg>
);
export const ChevronDown = ({ size }: P) => (
  <svg {...base(size)}><path d="m6 9 6 6 6-6" /></svg>
);
export const Clock = ({ size }: P) => (
  <svg {...base(size)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
export const Hourglass = ({ size }: P) => (
  <svg {...base(size)}><path d="M6 2h12M6 22h12M7 2c0 6 10 6 10 10S7 16 7 22M17 2c0 6-10 6-10 10s10 4 10 10" /></svg>
);
export const Flask = ({ size }: P) => (
  <svg {...base(size)}><path d="M9 3h6M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3" /><path d="M7 15h10" /></svg>
);
export const Shield = ({ size }: P) => (
  <svg {...base(size)}><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" /></svg>
);
export const Sparkles = ({ size }: P) => (
  <svg {...base(size)}><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" /><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" /></svg>
);
export const User = ({ size }: P) => (
  <svg {...base(size)}><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>
);
export const Check = ({ size }: P) => (
  <svg {...base(size)}><path d="m5 12 5 5 9-10" /></svg>
);
export const Circle = ({ size }: P) => (
  <svg {...base(size)}><circle cx="12" cy="12" r="8" /></svg>
);
export const Octagon = ({ size }: P) => (
  <svg {...base(size)}><path d="M8 2h8l6 6v8l-6 6H8l-6-6V8z" /><path d="M12 8v5M12 16.5v.5" /></svg>
);
export const Alert = ({ size }: P) => (
  <svg {...base(size)}><path d="M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17v.5" /></svg>
);
export const Info = ({ size }: P) => (
  <svg {...base(size)}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8v.5" /></svg>
);
export const Wrench = ({ size }: P) => (
  <svg {...base(size)}><path d="M14.7 6.3a4 4 0 0 0 5 5L21 13l-8 8-3-3 8-8-1.3-1.3a4 4 0 0 1-5-5L13 2z" transform="translate(-2 1)" /></svg>
);
export const Share = ({ size }: P) => (
  <svg {...base(size)}><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v13" /></svg>
);
export const Link = ({ size }: P) => (
  <svg {...base(size)}><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></svg>
);
export const File = ({ size }: P) => (
  <svg {...base(size)}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></svg>
);
export const Download = ({ size }: P) => (
  <svg {...base(size)}><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></svg>
);
export const Code = ({ size }: P) => (
  <svg {...base(size)}><path d="m8 7-5 5 5 5M16 7l5 5-5 5" /></svg>
);
export const Globe = ({ size }: P) => (
  <svg {...base(size)}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18" /></svg>
);
export const External = ({ size }: P) => (
  <svg {...base(size)}><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg>
);
export const Plus = ({ size }: P) => (
  <svg {...base(size)}><path d="M12 5v14M5 12h14" /></svg>
);
export const Radar = ({ size }: P) => (
  <svg {...base(size)}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><path d="M12 12 19 5" /></svg>
);
export const Book = ({ size }: P) => (
  <svg {...base(size)}><path d="M4 19V5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2zM20 19v2H6" /></svg>
);
export const X = ({ size }: P) => (
  <svg {...base(size)}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
