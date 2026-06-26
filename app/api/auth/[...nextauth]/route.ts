import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth";

const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

export async function GET(request: Request) {
  return handlers.GET(request as any);
}

export async function POST(request: Request) {
  return handlers.POST(request as any);
}
