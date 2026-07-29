export default function Loader({ fullScreen = false, size = 'md' }) {
  const sizes = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' };

  const spinner = (
    <div className="flex flex-col items-center gap-3">
      <div className={`${sizes[size]} rounded-full border-2 border-dark-600 border-t-primary-500 animate-spin`} />
      {fullScreen && (
        <p className="text-slate-500 text-sm animate-pulse">Loading...</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-dark-900 flex items-center justify-center z-50">
        <div className="flex flex-col items-center gap-4">
          <div className="text-3xl font-bold gradient-text">💰 ExpenseTracker</div>
          {spinner}
        </div>
      </div>
    );
  }

  return spinner;
}
