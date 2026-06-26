import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth";

const handler = NextAuth(authConfig);

export const GET = handler.GET;
export const POST = handler.POST;
