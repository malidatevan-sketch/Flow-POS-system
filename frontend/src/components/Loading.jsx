export function Spinner({ size = 20, className = '' }) {
  return (
    <svg className={`animate-spin ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export function PageLoader() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Spinner size={32} className="text-brand-500" />
        <span className="text-sm text-gray-400">Loading...</span>
      </div>
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return <div className={`bg-gray-200 rounded-xl animate-pulse ${className}`} />;
}
