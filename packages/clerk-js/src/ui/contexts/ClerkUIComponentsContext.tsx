import { camelToSnake } from '@clerk/shared';
import type { OrganizationResource, UserResource } from '@clerk/types';
import React from 'react';

import {
  buildAuthQueryString,
  buildURL,
  createDynamicParamParser,
  isAllowedRedirectOrigin,
  pickUrl,
} from '../../utils';
import { useCoreClerk, useEnvironment, useOptions } from '../contexts';
import type { ParsedQs } from '../router';
import { useRouter } from '../router';
import type {
  AvailableComponentCtx,
  CreateOrganizationCtx,
  OrganizationProfileCtx,
  OrganizationSwitcherCtx,
  SignInCtx,
  SignUpCtx,
  UserButtonCtx,
  UserProfileCtx,
} from '../types';

const populateParamFromObject = createDynamicParamParser({ regex: /:(\w+)/ });

export const ComponentContext = React.createContext<AvailableComponentCtx | null>(null);

export type SignUpContextType = SignUpCtx & {
  navigateAfterSignUp: () => any;
  queryParams: ParsedQs;
  signInUrl: string;
  secondFactorUrl: string;
  authQueryString: string | null;
};

export const useSignUpContext = (): SignUpContextType => {
  const { componentName, ...ctx } = (React.useContext(ComponentContext) || {}) as SignUpCtx;
  const { navigate } = useRouter();
  const { displayConfig } = useEnvironment();
  const { queryParams } = useRouter();
  const options = useOptions();
  const clerk = useCoreClerk();

  if (componentName !== 'SignUp') {
    throw new Error('Clerk: useSignUpContext called outside of the mounted SignUp component.');
  }

  const afterSignUpUrl = clerk.buildUrlWithAuth(
    pickUrl(['afterSignUpUrl', 'redirectUrl'], queryParams, {
      validator: url => isAllowedRedirectOrigin(url, options.allowedRedirectOrigins),
      formatter: camelToSnake,
    }) || pickUrl(['afterSignUpUrl', 'redirectUrl'], [ctx, options, displayConfig]),
  );

  const afterSignInUrl = clerk.buildUrlWithAuth(
    pickUrl(['afterSignInUrl', 'redirectUrl'], queryParams, {
      validator: url => isAllowedRedirectOrigin(url, options.allowedRedirectOrigins),
      formatter: camelToSnake,
    }) || pickUrl(['afterSignInUrl', 'redirectUrl'], [ctx, options, displayConfig]),
  );

  const navigateAfterSignUp = () => navigate(afterSignUpUrl);

  let signInUrl = pickUrl('signInUrl', [ctx, options, displayConfig]);

  // Add query strings to the sign in URL
  const authQs = buildAuthQueryString({
    afterSignInUrl: afterSignInUrl,
    afterSignUpUrl: afterSignUpUrl,
    displayConfig: displayConfig,
  });

  // Todo: Look for a better way than checking virtual
  if (authQs && ctx.routing != 'virtual') {
    signInUrl += `#/?${authQs}`;
  }

  // TODO: Avoid building this url again to remove duplicate code. Get it from window.Clerk instead.
  const secondFactorUrl = buildURL({ base: signInUrl, hashPath: '/factor-two' }, { stringify: true });

  return {
    ...ctx,
    componentName,
    signInUrl,
    secondFactorUrl,
    afterSignUpUrl,
    afterSignInUrl,
    navigateAfterSignUp,
    queryParams,
    authQueryString: authQs,
  };
};

export type SignInContextType = SignInCtx & {
  navigateAfterSignIn: () => any;
  queryParams: ParsedQs;
  signUpUrl: string;
  signUpContinueUrl: string;
  authQueryString: string | null;
};

export const useSignInContext = (): SignInContextType => {
  const { componentName, ...ctx } = (React.useContext(ComponentContext) || {}) as SignInCtx;
  const { navigate } = useRouter();
  const { displayConfig } = useEnvironment();
  const { queryParams } = useRouter();
  const options = useOptions();
  const clerk = useCoreClerk();

  if (componentName !== 'SignIn') {
    throw new Error('Clerk: useSignInContext called outside of the mounted SignIn component.');
  }

  const afterSignUpUrl = clerk.buildUrlWithAuth(
    pickUrl(['afterSignUpUrl', 'redirectUrl'], queryParams, {
      validator: url => isAllowedRedirectOrigin(url, options.allowedRedirectOrigins),
      formatter: camelToSnake,
    }) || pickUrl(['afterSignUpUrl', 'redirectUrl'], [ctx, options, displayConfig]),
  );

  const afterSignInUrl = clerk.buildUrlWithAuth(
    pickUrl(['afterSignInUrl', 'redirectUrl'], [queryParams], {
      validator: url => isAllowedRedirectOrigin(url, options.allowedRedirectOrigins),
      formatter: camelToSnake,
    }) || pickUrl(['afterSignInUrl', 'redirectUrl'], [ctx, options, displayConfig]),
  );

  const navigateAfterSignIn = () => navigate(afterSignInUrl);

  let signUpUrl = pickUrl('signUpUrl', [ctx, options, displayConfig]);

  // Add query strings to the sign in URL
  const authQs = buildAuthQueryString({
    afterSignInUrl: afterSignInUrl,
    afterSignUpUrl: afterSignUpUrl,
    displayConfig: displayConfig,
  });
  if (authQs && ctx.routing !== 'virtual') {
    signUpUrl += `#/?${authQs}`;
  }

  const signUpContinueUrl = buildURL({ base: signUpUrl, hashPath: '/continue' }, { stringify: true });

  return {
    ...ctx,
    componentName,
    signUpUrl,
    afterSignInUrl,
    afterSignUpUrl,
    navigateAfterSignIn,
    signUpContinueUrl,
    queryParams,
    authQueryString: authQs,
  };
};

export type UserProfileContextType = UserProfileCtx & {
  queryParams: ParsedQs;
  authQueryString: string | null;
};

// UserProfile does not accept any props except for
// `routing` and `path`
// TODO: remove if not needed during the components v2 overhaul
export const useUserProfileContext = (): UserProfileContextType => {
  const { componentName, ...ctx } = (React.useContext(ComponentContext) || {}) as UserProfileCtx;
  const { queryParams } = useRouter();

  if (componentName !== 'UserProfile') {
    throw new Error('Clerk: useUserProfileContext called outside of the mounted UserProfile component.');
  }

  return {
    ...ctx,
    componentName,
    queryParams,
    authQueryString: '',
  };
};

export const useUserButtonContext = () => {
  const { componentName, ...ctx } = (React.useContext(ComponentContext) || {}) as UserButtonCtx;
  const Clerk = useCoreClerk();
  const { navigate } = useRouter();
  const { displayConfig } = useEnvironment();
  const options = useOptions();

  if (componentName !== 'UserButton') {
    throw new Error('Clerk: useUserButtonContext called outside of the mounted UserButton component.');
  }

  const signInUrl = pickUrl('signInUrl', [ctx, options, displayConfig]);
  const userProfileUrl = pickUrl('userProfileUrl', [ctx, displayConfig]);
  const afterMultiSessionSingleSignOutUrl = pickUrl(
    ['afterMultiSessionSingleSignOutUrl', 'afterSignOutOneUrl'],
    [ctx, displayConfig],
  );
  const afterSignOutUrl = pickUrl(['afterSignOutUrl', 'afterSignOutAllUrl'], [ctx, displayConfig]);
  const afterSwitchSessionUrl = pickUrl(['afterSwitchSessionUrl', 'afterSignOutAllUrl'], [ctx, displayConfig]);

  const navigateAfterMultiSessionSingleSignOut = () => Clerk.redirectWithAuth(afterMultiSessionSingleSignOutUrl);
  const navigateAfterSignOut = () => navigate(afterSignOutUrl);
  const navigateAfterSwitchSession = () => navigate(afterSwitchSessionUrl);

  return {
    ...ctx,
    componentName,
    navigateAfterMultiSessionSingleSignOut,
    navigateAfterSignOut,
    navigateAfterSwitchSession,
    signInUrl,
    userProfileUrl,
    afterMultiSessionSingleSignOutUrl,
    afterSignOutUrl,
    afterSwitchSessionUrl,
  };
};

export const useOrganizationSwitcherContext = () => {
  const { componentName, ...ctx } = (React.useContext(ComponentContext) || {}) as OrganizationSwitcherCtx;
  const { navigate } = useRouter();
  const { displayConfig } = useEnvironment();

  if (componentName !== 'OrganizationSwitcher') {
    throw new Error('Clerk: useUserButtonContext called outside OrganizationSwitcher.');
  }

  const afterCreateOrganizationUrl = pickUrl('afterCreateOrganizationUrl', [ctx, displayConfig]);
  const afterLeaveOrganizationUrl = pickUrl('afterLeaveOrganizationUrl', [ctx, displayConfig]);
  const createOrganizationUrl = pickUrl('createOrganizationUrl', [ctx, displayConfig]);
  const organizationProfileUrl = pickUrl('organizationProfileUrl', [ctx, displayConfig]);

  const navigateCreateOrganization = () => navigate(createOrganizationUrl);
  const navigateOrganizationProfile = () => navigate(organizationProfileUrl);

  const navigateAfterSelectOrganizationOrPersonal = ({
    organization,
    user,
  }: {
    organization?: OrganizationResource;
    user?: UserResource;
  }) => {
    if (typeof ctx.afterSelectPersonalUrl === 'function' && user) {
      return navigate(ctx.afterSelectPersonalUrl(user));
    }

    if (typeof ctx.afterSelectOrganizationUrl === 'function' && organization) {
      return navigate(ctx.afterSelectOrganizationUrl(organization));
    }

    if (ctx.afterSelectPersonalUrl && user) {
      const parsedUrl = populateParamFromObject({
        urlWithParam: ctx.afterSelectPersonalUrl as string,
        entity: user,
      });
      return navigate(parsedUrl);
    }

    if (ctx.afterSelectOrganizationUrl && organization) {
      const parsedUrl = populateParamFromObject({
        urlWithParam: ctx.afterSelectOrganizationUrl as string,
        entity: organization,
      });
      return navigate(parsedUrl);
    }

    // Continue to support afterSwitchOrganizationUrl
    if (ctx.afterSwitchOrganizationUrl) {
      return navigate(ctx.afterSwitchOrganizationUrl);
    }

    return Promise.resolve();
  };

  const navigateAfterSelectOrganization = (organization: OrganizationResource) =>
    navigateAfterSelectOrganizationOrPersonal({ organization });

  const navigateAfterSelectPersonal = (user: UserResource) => navigateAfterSelectOrganizationOrPersonal({ user });

  return {
    ...ctx,
    hidePersonal: ctx.hidePersonal || false,
    organizationProfileMode: ctx.organizationProfileMode || 'modal',
    createOrganizationMode: ctx.createOrganizationMode || 'modal',
    afterCreateOrganizationUrl,
    afterLeaveOrganizationUrl,
    navigateOrganizationProfile,
    navigateCreateOrganization,
    navigateAfterSelectOrganization,
    navigateAfterSelectPersonal,
    componentName,
  };
};

export const useOrganizationProfileContext = () => {
  const { componentName, ...ctx } = (React.useContext(ComponentContext) || {}) as OrganizationProfileCtx;
  const { navigate } = useRouter();
  const { displayConfig } = useEnvironment();

  if (componentName !== 'OrganizationProfile') {
    throw new Error('Clerk: useOrganizationProfileContext called outside OrganizationProfile.');
  }

  const afterLeaveOrganizationUrl = pickUrl('afterLeaveOrganizationUrl', [ctx, displayConfig]);
  const navigateAfterLeaveOrganization = () => navigate(afterLeaveOrganizationUrl);

  return {
    ...ctx,
    navigateAfterLeaveOrganization,
    componentName,
  };
};

export const useCreateOrganizationContext = () => {
  const { componentName, ...ctx } = (React.useContext(ComponentContext) || {}) as CreateOrganizationCtx;
  const { navigate } = useRouter();
  const { displayConfig } = useEnvironment();

  if (componentName !== 'CreateOrganization') {
    throw new Error('Clerk: useCreateOrganizationContext called outside CreateOrganization.');
  }

  const navigateAfterCreateOrganization = (organization: OrganizationResource) => {
    if (typeof ctx.afterCreateOrganizationUrl === 'function') {
      return navigate(ctx.afterCreateOrganizationUrl(organization));
    }

    if (ctx.afterCreateOrganizationUrl) {
      const parsedUrl = populateParamFromObject({
        urlWithParam: ctx.afterCreateOrganizationUrl,
        entity: organization,
      });
      return navigate(parsedUrl);
    }

    return navigate(displayConfig.afterCreateOrganizationUrl);
  };

  return {
    ...ctx,
    navigateAfterCreateOrganization,
    componentName,
  };
};
