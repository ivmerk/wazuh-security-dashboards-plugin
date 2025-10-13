/*
 *   Copyright OpenSearch Contributors
 *
 *   Licensed under the Apache License, Version 2.0 (the "License").
 *   You may not use this file except in compliance with the License.
 *   A copy of the License is located at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   or in the "license" file accompanying this file. This file is distributed
 *   on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 *   express or implied. See the License for the specific language governing
 *   permissions and limitations under the License.
 */

import React from 'react';
import { i18n } from '@osd/i18n';
import {
  EuiSmallButton,
  EuiSmallButtonEmpty,
  EuiCallOut,
  EuiCompressedFieldPassword,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCompressedFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiOverlayMask,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { CoreStart } from 'opensearch-dashboards/public';
import { FormRow } from '../configuration/utils/form-row';
import { logout, updateNewPassword } from './utils';
import { PASSWORD_INSTRUCTION } from '../apps-constants';
import { constructErrorMessageAndLog } from '../error-utils';
import { validateCurrentPassword } from '../../utils/login-utils';
import { getDashboardsInfo } from '../../utils/dashboards-info-utils';
import { PasswordStrengthBar } from '../configuration/utils/password-strength-bar';

interface PasswordResetPanelProps {
  coreStart: CoreStart;
  username: string;
  handleClose: () => void;
  logoutUrl?: string;
}

export function PasswordResetPanel(props: PasswordResetPanelProps) {
  const [currentPassword, setCurrentPassword] = React.useState<string>('');
  // reply on backend response of login call to verify
  const [isCurrentPasswordInvalid, setIsCurrentPasswordInvalid] = React.useState<boolean>(false);
  const [currentPasswordError, setCurrentPasswordError] = React.useState<string[]>([]);

  const [newPassword, setNewPassword] = React.useState<string>('');
  // reply on backend response of user update call to verify
  const [isNewPasswordInvalid, setIsNewPasswordInvalid] = React.useState<boolean>(false);

  const [repeatNewPassword, setRepeatNewPassword] = React.useState<string>('');
  const [isRepeatNewPasswordInvalid, setIsRepeatNewPasswordInvalid] = React.useState<boolean>(
    false
  );

  const [errorCallOut, setErrorCallOut] = React.useState<string>('');

  const [passwordHelpText, setPasswordHelpText] = React.useState<string>(PASSWORD_INSTRUCTION);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setPasswordHelpText(
          (await getDashboardsInfo(props.coreStart.http)).password_validation_error_message
        );
      } catch (e) {
        console.error(e);
      }
    };

    fetchData();
  }, [props.coreStart.http]);

  const handleReset = async () => {
    // Reset all error states
    setIsCurrentPasswordInvalid(false);
    setCurrentPasswordError([]);
    setIsNewPasswordInvalid(false);
    setErrorCallOut('');

    // Basic validation
    if (!currentPassword) {
      setIsCurrentPasswordInvalid(true);
      setCurrentPasswordError(['Current password is required']);
      return;
    }

    if (!newPassword) {
      setIsNewPasswordInvalid(true);
      setErrorCallOut('New password is required');
      return;
    }

    if (newPassword !== repeatNewPassword) {
      setIsRepeatNewPasswordInvalid(true);
      setErrorCallOut('Passwords do not match');
      return;
    }

    const http = props.coreStart.http;
    
    // Validate current password
    try {
      await validateCurrentPassword(http, props.username, currentPassword);
      
      // Update to new password
      await updateNewPassword(http, newPassword, currentPassword);
      
      // Logout after successful password change
      await logout(http, props.logoutUrl);
    } catch (e) {
      const errorMessage = constructErrorMessageAndLog(e, 'Failed to reset password');
      if (errorMessage.toLowerCase().includes('current password') || errorMessage.includes('401')) {
        setIsCurrentPasswordInvalid(true);
        setCurrentPasswordError(['Incorrect current password']);
      } else if (errorMessage.toLowerCase().includes('password policy')) {
        setIsNewPasswordInvalid(true);
        setErrorCallOut(errorMessage);
      } else {
        setErrorCallOut(errorMessage);
      }
    }
  };

  // TODO: replace the instruction message for new password once UX provides it.
  return (
    <EuiOverlayMask>
      <EuiModal data-test-subj="reset-password-modal" onClose={props.handleClose}>
        <EuiSpacer />
        <EuiModalBody>
          <EuiText size="s">
            <h2>{i18n.translate('security.account.resetPassword.resetPasswordMenu.title', {
              defaultMessage: 'Reset password for {username}',
              values: { username: props.username }
            })}</h2>
          </EuiText>

          <EuiSpacer />

          <FormRow
            headerText={i18n.translate('security.account.resetPassword.resetPasswordMenu.currentPasswordLabel', {
              defaultMessage: 'Current password',})}
            helpText={i18n.translate('security.account.resetPassword.resetPasswordMenu.currentPasswordHelpText', {
            defaultMessage: 'Verify your account by entering your current password.',})}
            isInvalid={isCurrentPasswordInvalid}
            error={currentPasswordError}
          >
            <EuiCompressedFieldPassword
              data-test-subj="current-password"
              onChange={function (e: React.ChangeEvent<HTMLInputElement>) {
                setCurrentPassword(e.target.value);
                setIsCurrentPasswordInvalid(false);
              }}
              isInvalid={isCurrentPasswordInvalid}
              type="dual"
            />
          </FormRow>
          <EuiSpacer />

          <EuiFlexGroup direction="row">
            <EuiFlexItem grow={false}>
              <FormRow
                headerText={i18n.translate('security.account.resetPassword.resetPasswordMenu.newPasswordLabel', {
                  defaultMessage: 'New password',})}
                helpText={i18n.translate('security.account.resetPassword.resetPasswordMenu.newPasswordHelpText', {
                  defaultMessage: passwordHelpText,})}
                isInvalid={isNewPasswordInvalid}
              >
                <EuiCompressedFieldPassword
                  data-test-subj="new-password"
                  onChange={function (e: React.ChangeEvent<HTMLInputElement>) {
                    setNewPassword(e.target.value);
                    setIsNewPasswordInvalid(false);
                    setIsRepeatNewPasswordInvalid(repeatNewPassword !== newPassword);
                  }}
                  type="dual"
                  isInvalid={isNewPasswordInvalid}
                />
              </FormRow>
              <EuiCompressedFormRow>
                <PasswordStrengthBar password={newPassword} />
              </EuiCompressedFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>

          <FormRow
            headerText={i18n.translate('security.account.resetPassword.resetPasswordMenu.reEnterNewPasswordLabel', {
              defaultMessage: 'Re-enter new password',})}
            helpText={i18n.translate('security.account.resetPassword.resetPasswordMenu.reEnterNewPasswordHelpText', {
              defaultMessage: 'The password must be identical to what you entered above',})}
          >
            <EuiCompressedFieldPassword
              data-test-subj="reenter-new-password"
              isInvalid={isRepeatNewPasswordInvalid}
              onChange={function (e: React.ChangeEvent<HTMLInputElement>) {
                const value = e.target.value;
                setRepeatNewPassword(value);
                setIsRepeatNewPasswordInvalid(value !== newPassword);
              }}
              type="dual"
            />
          </FormRow>

          <EuiSpacer />

          {errorCallOut && (
            <EuiCallOut color="danger" iconType="alert">
              {errorCallOut}
            </EuiCallOut>
          )}
        </EuiModalBody>
        <EuiModalFooter>
          <EuiSmallButtonEmpty 
            data-test-subj="cancel" 
            onClick={props.handleClose}
          >
            {i18n.translate('security.account.resetPassword.resetPasswordMenu.cancelButton', {
              defaultMessage: 'Cancel'
            })}
          </EuiSmallButtonEmpty>

          <EuiSmallButton
            data-test-subj="reset"
            fill
            disabled={!currentPassword || !newPassword || newPassword !== repeatNewPassword}
            onClick={handleReset}
          >
            {i18n.translate('security.account.resetPassword.resetPasswordMenu.resetButton', {
              defaultMessage: 'Reset'})}
          </EuiSmallButton>
        </EuiModalFooter>
      </EuiModal>
    </EuiOverlayMask>
  );
}
