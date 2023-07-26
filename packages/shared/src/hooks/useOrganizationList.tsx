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
import { useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';

import { useClerkInstanceContext, useUserContext } from './contexts';

type UseOrganizationListParams = {
  userInvitations?:
    | true
    | (GetUserOrganizationInvitations & {
        aggregate?: boolean;
        controlled?: boolean;
      });
};

type OrganizationList = ReturnType<typeof createOrganizationList>;

type CustomSetAction<T = unknown> = (size: T | ((_size: T) => T)) => void;
type PaginatedDataAPI<T = unknown> = {
  data: T[];
  count: number;
  isLoadingInitial: boolean;
  isLoading: boolean;
  isError: boolean;
  page: number;
  // setPage: Dispatch<SetStateAction<number>>;
  setPage: CustomSetAction<number>;

  // fetchPrevious: () => void;
  // fetchNext: () => void;
};

// Utility type to convert PaginatedDataAPI to properties as undefined, except booleans set to false
type PaginatedDataAPIWithDefaults<T> = {
  [K in keyof PaginatedDataAPI<T>]: PaginatedDataAPI<T>[K] extends boolean ? false : PaginatedDataAPI<T>[K] | undefined;
};

type UseOrganizationListReturn =
  | {
      isLoaded: false;
      organizationList: undefined;
      createOrganization: undefined;
      setActive: undefined;
      userInvitations: PaginatedDataAPIWithDefaults<UserOrganizationInvitationResource>;
    }
  | {
      isLoaded: boolean;
      organizationList: OrganizationList;
      createOrganization: (params: CreateOrganizationParams) => Promise<OrganizationResource>;
      setActive: SetActive;
      userInvitations: PaginatedDataAPI<UserOrganizationInvitationResource>;
    };

type UseOrganizationList = (params?: UseOrganizationListParams) => UseOrganizationListReturn;

export const useOrganizationList: UseOrganizationList = params => {
  const { userInvitations } = params || {};

  const [paginatedPage, setPaginatedPage] = useState(1);
  const triggerInfinite = userInvitations !== true ? userInvitations?.aggregate ?? false : false;
  const dependsOnOffset = userInvitations !== true ? userInvitations?.controlled ?? true : true;

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

  /**
   * These are needed in order to support the
   */
  const internalLimit = userInvitationsParams?.limit ?? 10;
  const internalOffset = (paginatedPage - 1) * internalLimit;
  const interalParams =
    typeof userInvitationsParams === 'undefined'
      ? undefined
      : {
          limit: internalLimit,
          offset: internalOffset,
        };
  const paginatedParams = dependsOnOffset ? userInvitationsParams : interalParams;

  const shouldFetch = clerk.loaded && user;

  // Some gymnastics to adhere to the rules of hooks
  // We need to make sure useSWR is called on every render
  const fetchInvitations = !clerk.loaded
    ? () => ({ data: [], total_count: 0 } as ClerkPaginationResponse<UserOrganizationInvitationResource>)
    : () => user?.getOrganizationInvitations(paginatedParams);

  const {
    data: userInvitationsData,
    isValidating: userInvitationsValidating,
    isLoading: userInvitationsLoading,
    error: userInvitationsError,
  } = useSWR(
    !triggerInfinite && shouldFetch && paginatedParams ? cacheKey('userInvitations', user, paginatedParams) : null,
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

  const isomorphicPage = useMemo(() => {
    if (triggerInfinite) {
      return size;
    }
    return paginatedPage;
  }, [triggerInfinite, size, paginatedPage]);

  const isomporphicSetPage: CustomSetAction<number> = useCallback(
    numberOrgFn => {
      if (triggerInfinite) {
        void setSize(numberOrgFn);
        return;
      }
      return setPaginatedPage(numberOrgFn);
    },
    [internalLimit, setSize],
  );

  // TODO: Properly check for SSR user values
  if (!clerk.loaded || !user) {
    return {
      isLoaded: false,
      organizationList: undefined,
      createOrganization: undefined,
      setActive: undefined,
      userInvitations: {
        data: undefined,
        count: undefined,
        isLoadingInitial: false,
        isLoading: false,
        isError: false,
        page: undefined,
        setPage: undefined,
        // size: undefined,
        // setSize: undefined,
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
          isLoadingInitial: userInvitationsLoadingInfinite,
          isLoading: userInvitationsInfiniteValidating,
          isError: !!userInvitationsInfiniteError,
          page: isomorphicPage,
          setPage: isomporphicSetPage,
          // setSize,
          // size,
        }
      : {
          data: userInvitationsData?.data ?? [],
          count: userInvitationsData?.total_count ?? 0,
          isLoadingInitial: userInvitationsLoading,
          isError: !!userInvitationsError,
          isLoading: userInvitationsValidating,
          page: isomorphicPage,
          setPage: isomporphicSetPage,
          // size: undefined,
          // setSize: undefined,
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
