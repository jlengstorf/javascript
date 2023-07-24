import type {
  ClerkPaginationResponse,
  CreateOrganizationParams,
  GetUserOrganizationInvitations,
  OrganizationInvitationResource,
  OrganizationMembershipResource,
  OrganizationResource,
  SetActive,
  UserResource,
} from '@clerk/types';
import useSWR from 'swr';

import { useClerkInstanceContext, useUserContext } from './contexts';

type UseOrganizationListParams = {
  userInvitations?: true | GetUserOrganizationInvitations;
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
        // isSuccess: false;
        // isError: false;
      };
    }
  | {
      isLoaded: boolean;
      organizationList: OrganizationList;
      createOrganization: (params: CreateOrganizationParams) => Promise<OrganizationResource>;
      setActive: SetActive;
      userInvitations: {
        // data: Array<{ organization: OrganizationResource; invitation: OrganizationInvitationResource }>;
        data: OrganizationInvitationResource[];
        count: number;
        isLoading: boolean;
        // isSuccess: boolean;
        // isError: boolean;
      };
    };

type UseOrganizationList = (params?: UseOrganizationListParams) => UseOrganizationListReturn;

export const useOrganizationList: UseOrganizationList = params => {
  const { userInvitations } = params || {};
  const clerk = useClerkInstanceContext();
  const user = useUserContext();

  const userInvitationsParams = userInvitations === true ? {} : userInvitations;

  const shouldFetch = clerk.loaded && user;

  // Some gymnastics to adhere to the rules of hooks
  // We need to make sure useSWR is called on every render
  const fetchInvitations = !clerk.loaded
    ? () => ({ data: [], total_count: 0 } as ClerkPaginationResponse<OrganizationInvitationResource>)
    : () => user?.getOrganizationInvitations(userInvitationsParams);

  const {
    data: userInvitationsData,
    isValidating: userInvitationsLoading,
    // mutate: mutateUserInvitations,
  } = useSWR(
    shouldFetch && userInvitationsParams ? cacheKey('userInvitations', user, userInvitationsParams) : null,
    fetchInvitations,
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
        count: 0,
        isLoading: false,
      },
    };
  }

  return {
    isLoaded: !userInvitationsLoading,
    organizationList: createOrganizationList(user.organizationMemberships),
    setActive: clerk.setActive,
    createOrganization: clerk.createOrganization,
    userInvitations: {
      data: userInvitationsData?.data ?? [],
      count: userInvitationsData?.total_count ?? 0,
      isLoading: userInvitationsLoading,
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
  return [type, user.id, pagination.offset, pagination.limit].filter(Boolean).join('-');
}
