import { Gallery } from '../components/Gallery/Gallery';
import { Toaster } from 'react-hot-toast';

export function App() {
  return (
    <>
      <Gallery />
      <Toaster
        position="bottom-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#333',
            color: '#fff',
            borderRadius: '8px',
          },
          success: {
            duration: 2000,
            icon: '✓',
          },
          error: {
            duration: 4000,
            icon: '✕',
          },
          loading: {
            duration: 10000,
            icon: '⏳',
          },
        }}
      />
    </>
  );
}
