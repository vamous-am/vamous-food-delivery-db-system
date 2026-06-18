// frontend/src/components/common/LoadingSpinner.jsx
//
// Reusable Tailwind CSS circular spinner.
// Usage: <LoadingSpinner /> or <LoadingSpinner message="Loading orders…" />

const LoadingSpinner = ({ message = 'Loading…' }) => (
  <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 font-body">
    <div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-brand-400 animate-spin" />
    {message && <p className="text-gray-400 text-sm">{message}</p>}
  </div>
);

export default LoadingSpinner;
