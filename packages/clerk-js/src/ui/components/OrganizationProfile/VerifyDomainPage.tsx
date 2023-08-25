import React from 'react';

import { useWizard, Wizard } from '../../common';
import { useCoreOrganization, useEnvironment } from '../../contexts';
import { Button, descriptors, Flex, localizationKeys, Spinner } from '../../customizables';
import type { VerificationCodeCardProps } from '../../elements';
import {
  ContentPage,
  Form,
  FormButtonContainer,
  FormButtons,
  useCardState,
  useCodeControl,
  withCardStateProvider,
} from '../../elements';
import { CodeForm } from '../../elements/CodeForm';
import { useFetch, useLoadingStatus, useNavigateToFlowStart } from '../../hooks';
import { useRouter } from '../../router';
import { handleError, sleep, useFormControl } from '../../utils';
import { OrganizationProfileBreadcrumbs } from './OrganizationProfileNavbar';

export const VerifyDomainPage = withCardStateProvider(() => {
  const card = useCardState();
  const { organizationSettings } = useEnvironment();
  const { organization } = useCoreOrganization();
  const { params } = useRouter();
  const { navigateToFlowStart } = useNavigateToFlowStart();

  const [success, setSuccess] = React.useState(false);

  const { data: domain, status: domainStatus } = useFetch(organization?.getDomain, {
    domainId: params.id,
  });
  const title = localizationKeys('organizationProfile.verifyDomainPage.title');
  const subtitle = localizationKeys('organizationProfile.verifyDomainPage.subtitle', {
    domainName: domain?.name ?? '',
  });
  const status = useLoadingStatus();

  const codeControlState = useFormControl('code', '');
  const codeControl = useCodeControl(codeControlState);

  const wizard = useWizard({ onNextStep: () => card.setError(undefined) });

  const emailField = useFormControl('affiliationEmailAddress', '', {
    type: 'text',
    label: localizationKeys('formFieldLabel__organizationEmailDomainEmailAddress'),
    placeholder: localizationKeys('formFieldInputPlaceholder__organizationEmailDomainEmailAddress'),
    informationText: localizationKeys('formFieldLabel__organizationEmailDomainEmailAddressDescription'),
  });

  const resolve = async () => {
    setSuccess(true);
    await sleep(750);
  };

  const action: VerificationCodeCardProps['onCodeEntryFinishedAction'] = (code, resolve, reject) => {
    domain
      ?.attemptAffiliationVerification?.({ code })
      .then(async res => {
        await resolve();
        if (res.verification?.status === 'verified') {
          return navigateToFlowStart();
        }
        return;
      })
      .catch(err => reject(err));
  };

  const reject = async (err: any) => {
    handleError(err, [codeControlState], card.setError);
    status.setIdle();
    await sleep(750);
    codeControl.reset();
  };

  codeControl.onCodeEntryFinished(code => {
    status.setLoading();
    codeControlState.setError(undefined);
    action(code, resolve, reject);
  });

  if (!organization || !organizationSettings) {
    return null;
  }

  const handleResend = () => {
    codeControl.reset();
    domain?.prepareAffiliationVerification({ affiliationEmailAddress: emailField.value }).catch(err => {
      handleError(err, [emailField], card.setError);
    });
  };

  const dataChanged = organization.name !== emailField.value;
  const canSubmit = dataChanged;

  const onSubmitPrepare = (e: React.FormEvent) => {
    e.preventDefault();
    return domain
      ?.prepareAffiliationVerification({
        affiliationEmailAddress: `${emailField.value}@${domain.name}`,
      })
      .then(wizard.nextStep)
      .catch(err => {
        handleError(err, [emailField], card.setError);
      });
  };

  if (domainStatus.isLoading || !domain) {
    return (
      <Flex
        direction={'row'}
        align={'center'}
        justify={'center'}
        sx={t => ({
          height: '100%',
          minHeight: t.sizes.$120,
        })}
      >
        <Spinner
          size={'lg'}
          colorScheme={'primary'}
        />
      </Flex>
    );
  }

  return (
    <Wizard {...wizard.props}>
      <ContentPage
        headerTitle={title}
        headerSubtitle={subtitle}
        Breadcrumbs={OrganizationProfileBreadcrumbs}
      >
        <Form.Root onSubmit={onSubmitPrepare}>
          <Form.ControlRow elementId={emailField.id}>
            <Form.Control
              {...emailField.props}
              autoFocus
              groupSuffix={`@${domain.name}`}
              required
            />
          </Form.ControlRow>
          <FormButtons isDisabled={!canSubmit} />
        </Form.Root>
      </ContentPage>

      <ContentPage
        headerTitle={title}
        headerSubtitle={subtitle}
        Breadcrumbs={OrganizationProfileBreadcrumbs}
      >
        <CodeForm
          title={localizationKeys('organizationProfile.verifyDomainPage.formTitle')}
          subtitle={localizationKeys('organizationProfile.verifyDomainPage.formSubtitle')}
          resendButton={localizationKeys('organizationProfile.verifyDomainPage.resendButton')}
          isLoading={status.isLoading}
          success={success}
          codeControl={codeControl}
          onResendCodeClicked={handleResend}
        />

        <FormButtonContainer>
          <Button
            elementDescriptor={descriptors.formButtonReset}
            block={false}
            variant='ghost'
            textVariant='buttonExtraSmallBold'
            type='reset'
            isDisabled={status.isLoading || success}
            onClick={wizard.prevStep}
            localizationKey={localizationKeys('userProfile.formButtonReset')}
          />
        </FormButtonContainer>
      </ContentPage>
    </Wizard>
  );
});