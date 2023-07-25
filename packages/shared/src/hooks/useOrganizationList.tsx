import type {
  ClerkPaginationResponse,
  CreateOrganizationParams,
  GetUserOrganizationInvitations,
  OrganizationMembershipResource,
  OrganizationResource,
  SetActive,
  UserOrganizationInvitationResource,
  UserResource,
} from '@clerk/types';
import { useMemo } from 'react';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';

import { useClerkInstanceContext, useUserContext } from './contexts';

type UseOrganizationListParams = {
  userInvitations?:
    | true
    | (GetUserOrganizationInvitations & {
        aggregate: boolean;
      });
};

type OrganizationList = ReturnType<typeof createOrganizationList>;

type UseOrganizationListReturn =
  | {
      isLoaded: false;
      organizationList: undefined;
      createOrganization: undefined;
      setActive: undefined;
      userInvitations: {
        data: undefined;
        count: number;
        isLoading: false;
        isValidating: false;
        isError: false;
        size: undefined;
        setSize: undefined;
      };
    }
  | {
      isLoaded: boolean;
      organizationList: OrganizationList;
      createOrganization: (params: CreateOrganizationParams) => Promise<OrganizationResource>;
      setActive: SetActive;
      userInvitations: {
        data: UserOrganizationInvitationResource[];
        count: number;
        isLoading: boolean;
        isValidating: boolean;
        isError: boolean;
        size: number | undefined;
        setSize:
          | ((
              size: number | ((_size: number) => number),
            ) => Promise<(ClerkPaginationResponse<UserOrganizationInvitationResource> | undefined)[] | undefined>)
          | undefined;
      };
    };

type UseOrganizationList = (params?: UseOrganizationListParams) => UseOrganizationListReturn;

export const useOrganizationList: UseOrganizationList = params => {
  const { userInvitations } = params || {};

  const triggerInfinite = userInvitations !== true ? userInvitations?.aggregate ?? false : false;
  const clerk = useClerkInstanceContext();
  const user = useUserContext();

  const userInvitationsParams = useMemo(() => {
    if (!userInvitations) {
      return undefined;
    }
    if (userInvitations === true) {
      return {
        limit: 10,
        offset: 0,
      };
    }

    return {
      limit: userInvitations.limit ?? 10,
      offset: userInvitations.offset ?? 0,
    };
  }, [userInvitations]);

  const shouldFetch = clerk.loaded && user;

  // Some gymnastics to adhere to the rules of hooks
  // We need to make sure useSWR is called on every render
  const fetchInvitations = !clerk.loaded
    ? () => ({ data: [], total_count: 0 } as ClerkPaginationResponse<UserOrganizationInvitationResource>)
    : () => user?.getOrganizationInvitations(userInvitationsParams);

  const {
    data: userInvitationsData,
    isValidating: userInvitationsValidating,
    isLoading: userInvitationsLoading,
    error: userInvitationsError,
  } = useSWR(
    !triggerInfinite && shouldFetch && userInvitationsParams
      ? cacheKey('userInvitations', user, userInvitationsParams)
      : null,
    fetchInvitations,
  );

  const getInfiniteKey = (
    pageIndex: number,
    previousPageData: ClerkPaginationResponse<UserOrganizationInvitationResource> | null,
  ) => {
    if (!shouldFetch || !userInvitationsParams || !triggerInfinite) {
      return null;
    }

    const limit = userInvitationsParams?.limit;
    const offset = userInvitationsParams?.offset + pageIndex * limit;

    const param = {
      limit,
      offset,
    };

    return cacheKey('userInvitations', user, param);
  };

  const {
    data: userInvitationsDataInfinite,
    isLoading: userInvitationsLoadingInfinite,
    isValidating: userInvitationsInfiniteValidating,
    error: userInvitationsInfiniteError,
    size,
    setSize,
  } = useSWRInfinite(getInfiniteKey, str => {
    const { offset, limit } = JSON.parse(str);

    return !clerk.loaded || !user
      ? ({ data: [], total_count: 0 } as ClerkPaginationResponse<UserOrganizationInvitationResource>)
      : user.getOrganizationInvitations({
          offset: parseInt(offset),
          limit: parseInt(limit),
        });
  });

  // TODO: Properly check for SSR user values
  if (!clerk.loaded || !user) {
    return {
      isLoaded: false,
      organizationList: undefined,
      createOrganization: undefined,
      setActive: undefined,
      userInvitations: {
        data: undefined,
        count: 0,
        isLoading: false,
        isValidating: false,
        isError: false,
        size: undefined,
        setSize: undefined,
      },
    };
  }

  return {
    isLoaded: !userInvitationsLoading,
    organizationList: createOrganizationList(user.organizationMemberships),
    setActive: clerk.setActive,
    createOrganization: clerk.createOrganization,
    userInvitations: triggerInfinite
      ? {
          data: userInvitationsDataInfinite?.map(a => a?.data).flat() ?? [],
          count: userInvitationsDataInfinite?.[userInvitationsDataInfinite?.length - 1]?.total_count || 0,
          isLoading: userInvitationsLoadingInfinite,
          isValidating: userInvitationsInfiniteValidating,
          isError: !!userInvitationsInfiniteError,
          setSize,
          size,
        }
      : {
          data: userInvitationsData?.data ?? [],
          count: userInvitationsData?.total_count ?? 0,
          isLoading: userInvitationsLoading,
          isError: !!userInvitationsError,
          isValidating: userInvitationsValidating,
          size: undefined,
          setSize: undefined,
        },
  };
};

function createOrganizationList(organizationMemberships: OrganizationMembershipResource[]) {
  return organizationMemberships.map(organizationMembership => ({
    membership: organizationMembership,
    organization: organizationMembership.organization,
  }));
}

function cacheKey(type: 'userInvitations', user: UserResource, pagination: GetUserOrganizationInvitations) {
  return JSON.stringify({
    type,
    userId: user.id,
    offset: pagination.offset,
    limit: pagination.limit,
  });
}
