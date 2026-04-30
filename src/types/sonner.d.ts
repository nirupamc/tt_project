declare module "sonner" {
  export interface ToastApi {
    (message: string, options?: unknown): unknown;
    success: (message: string, options?: unknown) => unknown;
    error: (message: string, options?: unknown) => unknown;
    info: (message: string, options?: unknown) => unknown;
    warning: (message: string, options?: unknown) => unknown;
    loading: (message: string, options?: unknown) => unknown;
    dismiss: (id?: string | number) => void;
  }

  export type ToasterProps = Record<string, unknown>;

  export const toast: ToastApi;
  export function Toaster(props: ToasterProps): JSX.Element;
}
