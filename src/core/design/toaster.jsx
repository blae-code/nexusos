import { useToast } from "@/core/design/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/core/design/toast";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const borderColor =
          variant === 'destructive' ? '#C0392B' :
          variant === 'success' ? '#4A8C5C' :
          variant === 'warning' ? '#C8A84B' :
          '#5A5850';

        return (
          <Toast
            key={id}
            {...props}
            style={{
              background: '#0F0F0D',
              borderLeft: `2px solid ${borderColor}`,
              borderTop: '0.5px solid rgba(200,170,100,0.10)',
              borderRight: '0.5px solid rgba(200,170,100,0.10)',
              borderBottom: '0.5px solid rgba(200,170,100,0.10)',
              borderRadius: 2,
              padding: '12px 16px',
              minWidth: 280,
              maxWidth: 380,
              boxShadow: 'none',
              animation: 'slideIn 200ms ease-out',
              ...(props.style || {}),
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1 }}>
              {title && (
                <ToastTitle style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 600,
                  fontSize: 12,
                  color: '#E8E4DC',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  lineHeight: 1.3,
                }}>
                  {title}
                </ToastTitle>
              )}
              {description && (
                <ToastDescription style={{
                  fontFamily: "'Barlow', sans-serif",
                  fontWeight: 400,
                  fontSize: 12,
                  color: '#9A9488',
                  marginTop: 2,
                  lineHeight: 1.5,
                }}>
                  {description}
                </ToastDescription>
              )}
            </div>
            {action}
            <ToastClose style={{
              color: '#5A5850',
              opacity: 1,
            }} />
          </Toast>
        );
      })}
      <ToastViewport style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: 0,
        margin: 0,
        listStyle: 'none',
        outline: 'none',
      }} />
      <style>{`
        @keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
        @keyframes slideOut { from { opacity:1; transform:translateX(0); } to { opacity:0; transform:translateX(20px); } }
      `}</style>
    </ToastProvider>
  );
}