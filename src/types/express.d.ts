/** Express request state added by the HirePath request-ID and auth middleware. */
declare global {
  namespace Express {
    interface Request {
      id?: string;
      user?: {
        id: number;
        email: string;
        name: string;
        role: string;
        token_version?: number;
      };
    }
  }
}
export {};
