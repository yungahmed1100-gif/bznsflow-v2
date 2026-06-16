import { ViteReactSSG } from 'vite-react-ssg';
import { routes } from './routes';
import './index.css';

// vite-react-ssg entry: prerenders each route to static HTML at build time and
// hydrates on the client. Replaces the old ReactDOM.createRoot CSR mount.
export const createRoot = ViteReactSSG({ routes });
