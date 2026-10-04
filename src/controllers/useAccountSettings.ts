import { useEffect, useState } from 'react';
import { request, type Runner } from '../components/common';

export const deleteConfirmation = 'DELETE';

type Options = {
  run: Runner;
  signedOut: () => void;
  passwordChanged: () => void;
};

export function useAccountSettings({ run, signedOut, passwordChanged }: Options) {
  const [showDelete, setShowDelete] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPasswordError, setCurrentPasswordError] = useState('');
  const [passwordModalError, setPasswordModalError] = useState('');
  const [passwordNotice, setPasswordNotice] = useState('');
  const [developmentResetUrl, setDevelopmentResetUrl] = useState('');
  const [passwordWorking, setPasswordWorking] = useState(false);

  const closeDelete = () => {
    setShowDelete(false);
    setConfirmation('');
  };

  const resetPasswordModal = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setCurrentPasswordError('');
    setPasswordModalError('');
    setPasswordNotice('');
    setDevelopmentResetUrl('');
  };

  const closeChangePassword = () => {
    setShowChangePassword(false);
    resetPasswordModal();
  };

  const openChangePassword = () => {
    resetPasswordModal();
    setShowChangePassword(true);
  };

  useEffect(() => {
    if (!showDelete && !showChangePassword) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (showDelete) closeDelete();
      if (showChangePassword) closeChangePassword();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [showDelete, showChangePassword]);

  const updateCurrentPassword = (value: string) => {
    setCurrentPassword(value);
    setCurrentPasswordError('');
    setPasswordModalError('');
  };

  const signOut = () =>
    run(async () => {
      await request('/auth/logout', 'POST');
      signedOut();
    });

  const sendPasswordReset = () =>
    run(async () => {
      setPasswordWorking(true);
      try {
        const result = await request<{ message: string; developmentResetUrl?: string }>(
          '/auth/account/password-reset',
          'POST',
        );
        setPasswordNotice(result.message);
        setDevelopmentResetUrl(result.developmentResetUrl ?? '');
      } finally {
        setPasswordWorking(false);
      }
    });

  const changePassword = async () => {
    setPasswordWorking(true);
    setCurrentPasswordError('');
    setPasswordModalError('');
    setPasswordNotice('');
    try {
      await request('/auth/change-password', 'POST', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      closeChangePassword();
      passwordChanged();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to change password';
      if (message === 'Current password is incorrect') {
        setCurrentPasswordError('Current password does not match your existing password.');
      } else {
        setPasswordModalError(message);
      }
    } finally {
      setPasswordWorking(false);
    }
  };

  const deleteAccount = () => {
    if (confirmation !== deleteConfirmation) return;
    return run(async () => {
      await request('/auth/account', 'DELETE', { confirmation });
      signedOut();
    });
  };

  return {
    showDelete,
    openDelete: () => setShowDelete(true),
    closeDelete,
    showChangePassword,
    openChangePassword,
    closeChangePassword,
    confirmation,
    setConfirmation,
    currentPassword,
    updateCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    currentPasswordError,
    passwordModalError,
    passwordNotice,
    developmentResetUrl,
    passwordWorking,
    newPasswordInvalid: newPassword.length > 0 && newPassword.length < 5,
    passwordsDoNotMatch: confirmPassword.length > 0 && newPassword !== confirmPassword,
    signOut,
    sendPasswordReset,
    changePassword,
    deleteAccount,
  };
}
