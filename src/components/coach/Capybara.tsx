export function Capybara({ size = 48 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Your Money Coach capybara"
    >
      <circle cx="32" cy="32" r="31" fill="#dff2df" />
      <path
        d="M15.5 33c0-10.7 7.1-18.2 17.8-18.2 9.7 0 16.4 5.6 16.4 15.1v11.7c0 4.1-3.3 7.4-7.4 7.4H24c-5.1 0-9.2-4.1-9.2-9.2 0-2.4.2-4.7.7-6.8Z"
        fill="#a56f45"
      />
      <path
        d="M20.4 20.4c-1.6-4.8 5.2-6.5 7.4-2.2M41.5 17.1c2.8-3.4 7.8.8 5.1 4.6"
        fill="#8b5b38"
        stroke="#70472e"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M29.5 31.8h14.7c3.8 0 6.8 3 6.8 6.8v1.1c0 5.1-4.2 9.3-9.3 9.3h-8.6c-4.4 0-7.9-3.6-7.9-7.9v-5c0-2.4 1.9-4.3 4.3-4.3Z"
        fill="#c68e5c"
      />
      <circle cx="28.5" cy="28.5" r="2" fill="#263a31" />
      <circle cx="43" cy="28.5" r="2" fill="#263a31" />
      <ellipse cx="45.5" cy="37.2" rx="2.5" ry="2" fill="#4b3427" />
      <path
        d="M45.3 40.2c-1 1.4-2.4 2-4.1 1.8"
        fill="none"
        stroke="#4b3427"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
