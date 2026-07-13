const Modal = ({ open, title, onClose, children, widthClass = 'max-w-3xl' }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className={`w-full ${widthClass} bg-slate-900 border border-slate-700 rounded-portal shadow-panel my-8`}>
        {title ? (
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
            <h3 className="font-heading text-xl text-slate-100">{title}</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-100">Close</button>
          </div>
        ) : null}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
