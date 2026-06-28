import { createContext, useCallback, useContext, useRef, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './alert-dialog';

const ConfirmContext = createContext(null);

/**
 * Promise-based confirm() using Shadcn AlertDialog.
 *
 * Usage:
 *   const confirm = useConfirm();
 *   if (!(await confirm('¿Eliminar?', { description: 'Esto no se puede deshacer.' }))) return;
 *
 * Options:
 *   - title (string)              -> shown as <AlertDialogTitle>
 *   - description (string)        -> shown below title
 *   - confirmText (string)        -> primary button label (default "Confirmar")
 *   - cancelText (string)         -> cancel label (default "Cancelar")
 *   - destructive (bool)          -> renders confirm button in red
 *   - testId (string)             -> data-testid prefix for both buttons
 */
export const ConfirmProvider = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState({});
  const resolverRef = useRef(null);

  const confirm = useCallback((titleOrOptions, maybeOptions) => {
    const options =
      typeof titleOrOptions === 'string'
        ? { title: titleOrOptions, ...(maybeOptions || {}) }
        : titleOrOptions || {};
    setOpts({
      title: options.title || '¿Confirmar acción?',
      description: options.description || '',
      confirmText: options.confirmText || 'Confirmar',
      cancelText: options.cancelText || 'Cancelar',
      destructive: !!options.destructive,
      testId: options.testId || 'confirm-dialog',
    });
    setOpen(true);
    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const handleCancel = () => {
    setOpen(false);
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
  };

  const handleConfirm = () => {
    setOpen(false);
    if (resolverRef.current) {
      resolverRef.current(true);
      resolverRef.current = null;
    }
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog open={open} onOpenChange={(o) => { if (!o) handleCancel(); }}>
        <AlertDialogContent data-testid={opts.testId}>
          <AlertDialogHeader>
            <AlertDialogTitle>{opts.title}</AlertDialogTitle>
            {opts.description && (
              <AlertDialogDescription>{opts.description}</AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel} data-testid={`${opts.testId}-cancel`}>
              {opts.cancelText}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              data-testid={`${opts.testId}-confirm`}
              className={
                opts.destructive
                  ? 'bg-red-600 hover:bg-red-700 focus:ring-red-600'
                  : 'bg-blue-600 hover:bg-blue-700'
              }
            >
              {opts.confirmText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm must be used inside <ConfirmProvider>');
  }
  return ctx;
};
