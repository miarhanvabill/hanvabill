import { getBusinessAnalytics } from "./app/actions/analytics";
import { sql } from "@vercel/postgres";
// mock the auth to simulate a call
jest.mock('@clerk/nextjs/server', () => ({
  auth: () => ({ userId: 'test', orgId: 'test' })
}));
