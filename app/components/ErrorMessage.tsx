'use client';

// Terracotta: a warm rust red that sits between the orange and red in our palette.
const TERRACOTTA = '#C84B31';

export function ErrorMessage({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      className="flex flex-col gap-2 p-4 font-[family-name:var(--font-dm-sans)]"
      style={{ background: '#FEF4F2', borderLeft: `4px solid ${TERRACOTTA}` }}
      role="alert"
    >
      <p className="text-sm text-ink leading-relaxed">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="self-start text-xs font-semibold px-3 py-1.5 transition-opacity hover:opacity-70"
          style={{ color: TERRACOTTA }}
        >
          Try again
        </button>
      )}
    </div>
  );
}
