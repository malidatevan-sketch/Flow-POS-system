export default function Modal({ open, onClose, title, children, size = 'md' }) {
  if (!open) return null;
  const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg' };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className={`card ${widths[size]} w-full p-6 m-4 relative z-10 animate-slide-up md:animate-scale-in`}
        onClick={e => e.stopPropagation()}
      >
        {title && <h3 className="text-lg font-bold mb-4">{title}</h3>}
        {children}
      </div>
    </div>
  );
}
