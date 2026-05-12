const $form = document.getElementById('loginForm');
const $password = document.getElementById('password');
const $username = document.getElementById('username');
const $visible = document.getElementById('visible');
const $rememberMe = document.getElementById('rememberMe');
const $forgotPassword = document.getElementById('forgotPassword');
const $register = document.getElementById('register');
const $formMessage = document.getElementById('formMessage');
const $resetPanel = document.getElementById('resetPanel');
const $resetCurrentPassword = document.getElementById('resetCurrentPassword');
const $resetNewPassword = document.getElementById('resetNewPassword');
const $applyResetPassword = document.getElementById('applyResetPassword');
const $cancelResetPassword = document.getElementById('cancelResetPassword');
const $recoveryCode = document.getElementById('recoveryCode');
const $resetNewPasswordByCode = document.getElementById('resetNewPasswordByCode');
const $applyResetByCode = document.getElementById('applyResetByCode');
const $recoveryCodeNotice = document.getElementById('recoveryCodeNotice');
const $recoveryCodeValue = document.getElementById('recoveryCodeValue');

function setFormMessage(message, isError = true) {
  if (!$formMessage) {
    return;
  }

  $formMessage.textContent = message || '';
  $formMessage.classList.toggle('text-red-300', isError);
  $formMessage.classList.toggle('text-emerald-300', !isError);
}

function focusField(field) {
  if (!field) {
    return;
  }

  field.focus();
  if (typeof field.select === 'function') {
    field.select();
  }
}

function showResetPanel(show) {
  if (!$resetPanel) {
    return;
  }

  $resetPanel.classList.toggle('hidden', !show);
}

function showRecoveryCodeNotice(code) {
  if (!$recoveryCodeNotice || !$recoveryCodeValue) {
    return;
  }

  if (!code) {
    $recoveryCodeNotice.classList.add('hidden');
    $recoveryCodeValue.textContent = '';
    return;
  }

  $recoveryCodeValue.textContent = code;
  $recoveryCodeNotice.classList.remove('hidden');
}

function getElectronApi() {
  if (!window.electronAPI) {
    setFormMessage('La API de electron no esta disponible.');
    return null;
  }

  return window.electronAPI;
}

document.addEventListener('DOMContentLoaded', async () => {
  const api = getElectronApi();
  if (!api) {
    return;
  }

  const rememberedUsername = await api.getRemembered();

  if (rememberedUsername) {
    $username.value = rememberedUsername;
    $rememberMe.checked = true;
  }

  focusField($username);
});

// Keep stored remembered email in sync when user toggles the checkbox
$rememberMe.addEventListener('change', async () => {
  const api = getElectronApi();
  if (!api) return;

  if ($rememberMe.checked) {
    const name = $username.value.trim();
    if (name) await api.setRemembered(name);
  } else {
    await api.clearRemember();
  }
});

// If user edits the email while remember is checked, update stored value
$username.addEventListener('blur', async () => {
  const api = getElectronApi();
  if (!api) return;
  if ($rememberMe.checked) {
    const name = $username.value.trim();
    if (name) await api.setRemembered(name);
  }
});

$username.addEventListener('input', () => setFormMessage(''));
$password.addEventListener('input', () => setFormMessage(''));

$visible.addEventListener('change', () => {
  $password.type = $visible.checked ? 'text' : 'password';
});

$forgotPassword.addEventListener('click', async (event) => {
  event.preventDefault();

  const api = getElectronApi();
  if (!api) {
    return;
  }

  const email = $username.value.trim().toLowerCase();
  if (!email) {
    setFormMessage('Primero escribe tu correo y luego presiona olvidar contrasena.');
    focusField($username);
    return;
  }

  const result = await api.requestRecoveryCode({ email });
  if (!result.ok) {
    setFormMessage(result.message);
    focusField($username);
    return;
  }

  showResetPanel(true);
  setFormMessage(result.message, false);
  showRecoveryCodeNotice('Te enviamos un codigo a tu correo. Revisa tu bandeja de entrada.');
  focusField($recoveryCode);
});

$applyResetPassword.addEventListener('click', async () => {
  const api = getElectronApi();
  if (!api) {
    return;
  }

  const email = $username.value.trim().toLowerCase();
  const currentPassword = $resetCurrentPassword.value;
  const newPassword = $resetNewPassword.value;

  if (!email) {
    setFormMessage('Debes escribir el correo.');
    focusField($username);
    return;
  }

  if (!currentPassword) {
    setFormMessage('Debes escribir la contrasena actual.');
    focusField($resetCurrentPassword);
    return;
  }

  if (!newPassword) {
    setFormMessage('Debes escribir la nueva contrasena.');
    focusField($resetNewPassword);
    return;
  }

  const result = await api.resetPassword({ email, currentPassword, newPassword });
  setFormMessage(result.ok ? 'La contrasena fue actualizada.' : result.message, !result.ok);

  if (!result.ok) {
    focusField($resetCurrentPassword);
    return;
  }

  $resetCurrentPassword.value = '';
  $resetNewPassword.value = '';
  showResetPanel(false);
  focusField($password);
});

$cancelResetPassword.addEventListener('click', () => {
  $resetCurrentPassword.value = '';
  $resetNewPassword.value = '';
  $recoveryCode.value = '';
  $resetNewPasswordByCode.value = '';
  showResetPanel(false);
  setFormMessage('');
  focusField($password);
});

$applyResetByCode.addEventListener('click', async () => {
  const api = getElectronApi();
  if (!api) {
    return;
  }

  const email = $username.value.trim().toLowerCase();
  const recoveryCode = $recoveryCode.value.trim().toUpperCase();
  const newPassword = $resetNewPasswordByCode.value;

  if (!email) {
    setFormMessage('Debes escribir el correo.');
    focusField($username);
    return;
  }

  if (!recoveryCode) {
    setFormMessage('Debes escribir el codigo de recuperacion.');
    focusField($recoveryCode);
    return;
  }

  if (!newPassword) {
    setFormMessage('Debes escribir la nueva contrasena.');
    focusField($resetNewPasswordByCode);
    return;
  }

  const result = await api.resetWithCode({ email, recoveryCode, newPassword });
  setFormMessage(result.ok ? result.message : result.message, !result.ok);

  if (!result.ok) {
    focusField($recoveryCode);
    return;
  }

  $recoveryCode.value = '';
  $resetNewPasswordByCode.value = '';
  showRecoveryCodeNotice(result.nextRecoveryCode || '');
  focusField($password);
});

$register.addEventListener('click', async () => {
  const api = getElectronApi();
  if (!api) {
    return;
  }

  const email = $username.value.trim().toLowerCase();
  const password = $password.value;

  if (!email || !password) {
    setFormMessage('Debes escribir correo y contrasena para registrarte.');

    if (!email) {
      focusField($username);
    } else {
      focusField($password);
    }

    return;
  }

  const result = await api.register({ email, password });
  setFormMessage(
    result.ok ? 'Cuenta creada correctamente. Ya puedes iniciar sesion.' : result.message,
    !result.ok
  );

  if (result.ok) {
    showRecoveryCodeNotice('');
    focusField($password);
    return;
  }

  showRecoveryCodeNotice('');

  focusField($password);
});

$form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const api = getElectronApi();
  if (!api) {
    return;
  }

  const email = $username.value.trim().toLowerCase();
  const password = $password.value;

  if (!email || !password) {
    setFormMessage('Debes escribir correo y contrasena.');

    if (!email) {
      focusField($username);
    } else {
      focusField($password);
    }

    return;
  }

  const result = await api.login({
    email,
    password,
    rememberMe: $rememberMe.checked,
  });

  if (!result.ok) {
    setFormMessage(result.message);
    if (
      String(result.message || '')
        .toLowerCase()
        .includes('correo no encontrado')
    ) {
      focusField($username);
    } else {
      focusField($password);
    }
    return;
  }

  setFormMessage('');
  showRecoveryCodeNotice('');
});
