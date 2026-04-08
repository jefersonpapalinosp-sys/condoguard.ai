import { useEffect, useState } from 'react';
import { subscribeApiFallback, type ApiFallbackDetail } from '../../services/apiStatus';

type ToastState = {
  id: number;
  text: string;
} | null;

export function ApiFallbackToast() {
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const unsubscribe = subscribeApiFallback((detail: ApiFallbackDetail) => {
      setToast({
        id: Date.now(),
        text: `${detail.module}: API indisponivel. Exibindo dados de fallback.`,
      });
    });

    return () => {
      unsubscribe();
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = setTimeout(() => {
      setToast(null);
    }, 3500);

    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) {
    return null;
  }

  return (
    <div className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-3 right-3 z-[100] rounded-xl border border-error/20 bg-error-container px-4 py-3 text-on-error-container shadow-lg md:left-auto md:right-5 md:max-w-sm">
      <p className="text-xs font-bold uppercase tracking-widest">Aviso de conectividade</p>
      <p className="text-sm mt-1">{toast.text}</p>
    </div>
  );
}
