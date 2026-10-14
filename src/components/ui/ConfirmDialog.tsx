import {
  // btnPrimary,
  btnSecondary } from './common';

export function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }: {
  title: string; message: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="w-full max-w-sm rounded-lg bg-white p-5 shadow-lg">
        <h2 id="confirm-title" className="font-semibold text-slate-900">{title}</h2>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button className={btnSecondary} onClick={onCancel} autoFocus>Cancel</button>
          <button className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}