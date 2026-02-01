import { toast } from 'react-hot-toast';

interface ConfirmOptions {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
}

export const confirm = async (
  description: string,
  options: ConfirmOptions = {}
): Promise<boolean> => {
  const { title = 'Confirm Action', confirmText = 'Yes', cancelText = 'No' } = options;

  return new Promise((resolve) => {
    toast(
      (t) => (
        <div style={{ padding: '12px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>{title}</div>
          <div style={{ marginBottom: '12px' }}>{description}</div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                resolve(false);
              }}
              style={{
                padding: '6px 12px',
                backgroundColor: '#e2e8f0',
                border: '1px solid #cbd5e0',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                resolve(true);
              }}
              style={{
                padding: '6px 12px',
                backgroundColor: '#e53e3e',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      ),
      {
        duration: 0, // Don't auto-dismiss
        position: 'top-center',
      }
    );
  });
};