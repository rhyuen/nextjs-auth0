import { GetServerSideProps, GetServerSidePropsContext, GetServerSidePropsResult } from 'next';
import { Claims, Session, SessionCache } from '../session';
import { assertCtx } from '../utils/assert';
import React, { ComponentType } from 'react';
import { WithPageAuthRequiredOptions as WithPageAuthRequiredCSROptions } from '../frontend/with-page-auth-required';
import { withPageAuthRequired as withPageAuthRequiredCSR } from '../frontend';

export type GetServerSidePropsResultWithSession = GetServerSidePropsResult<{
  user?: Claims | null;
  [key: string]: any;
}>;

export type PageRoute = (cts: GetServerSidePropsContext) => Promise<GetServerSidePropsResultWithSession>;

export type WithPageAuthRequiredOptions = { getServerSideProps?: GetServerSideProps; loginUrl?: string };

export type WithPageAuthRequired = {
  (opts?: WithPageAuthRequiredOptions): PageRoute;
  <P extends object>(Component: ComponentType<P>, options?: WithPageAuthRequiredCSROptions): React.FC<P>;
};

export default function withPageAuthRequiredFactory(sessionCache: SessionCache): WithPageAuthRequired {
  return (
    optsOrComponent: WithPageAuthRequiredOptions | ComponentType = {},
    csrOpts?: WithPageAuthRequiredCSROptions
  ): any => {
    if (typeof optsOrComponent === 'function') {
      return withPageAuthRequiredCSR(optsOrComponent, csrOpts);
    }
    const { getServerSideProps, loginUrl = '/api/auth/login' } = optsOrComponent;
    return async (ctx: GetServerSidePropsContext): Promise<GetServerSidePropsResultWithSession> => {
      assertCtx(ctx);
      if (!sessionCache.isAuthenticated(ctx.req, ctx.res)) {
        // 10 - redirect
        // 9.5.4 - unstable_redirect
        // 9.4 - res.setHeaders
        return { redirect: { destination: `${loginUrl}?returnTo=${ctx.resolvedUrl}`, permanent: false } };
      }
      const session = sessionCache.get(ctx.req, ctx.res) as Session;
      let ret: any = { props: {} };
      if (getServerSideProps) {
        ret = await getServerSideProps(ctx);
      }
      return { ...ret, props: { ...ret.props, user: session.user } };
    };
  };
}