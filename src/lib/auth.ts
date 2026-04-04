import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { createAdminClient } from './supabase';
import type { SessionUser, UserRole } from '@/types';

declare module 'next-auth' {
  interface Session {
    user: SessionUser;
  }
  interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    avatar_url?: string | null;
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id: string;
    role: UserRole;
    avatar_url?: string | null;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log('Auth: Missing credentials');
          return null;
        }

        console.log('Auth: Attempting login for:', credentials.email);

        const supabase = createAdminClient();
        const { data: user, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', credentials.email)
          .single();

        if (error) {
          console.log('Auth: Supabase error:', error.message);
          return null;
        }

        if (!user) {
          console.log('Auth: User not found');
          return null;
        }

        console.log('Auth: User found, checking password...');
        console.log('Auth: Hash from DB:', user.password_hash?.substring(0, 20) + '...');

        const isValidPassword = await bcrypt.compare(
          credentials.password as string,
          user.password_hash
        );

        console.log('Auth: Password valid:', isValidPassword);

        if (!isValidPassword) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as UserRole,
          avatar_url: user.avatar_url,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.avatar_url = user.avatar_url;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.avatar_url = token.avatar_url;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
});
