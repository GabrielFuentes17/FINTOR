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

    const username = $username.value.trim();
    if (!username) {
        setFormMessage('Primero escribe tu usuario y luego presiona Forgot password.');
        focusField($username);
        return;
    }

    showResetPanel(true);
    setFormMessage('Escribe tu contrasena actual y una nueva para actualizarla.', false);
    showRecoveryCodeNotice('');
    focusField($resetCurrentPassword);
});

$applyResetPassword.addEventListener('click', async () => {
    const api = getElectronApi();
    if (!api) {
        return;
    }

    const username = $username.value.trim();
    const currentPassword = $resetCurrentPassword.value;
    const newPassword = $resetNewPassword.value;

    if (!username) {
        setFormMessage('Debes escribir el usuario.');
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

    const result = await api.resetPassword({ username, currentPassword, newPassword });
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

    const username = $username.value.trim();
    const recoveryCode = $recoveryCode.value.trim().toUpperCase();
    const newPassword = $resetNewPasswordByCode.value;

    if (!username) {
        setFormMessage('Debes escribir el usuario.');
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

    const result = await api.resetWithCode({ username, recoveryCode, newPassword });
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

    const username = $username.value.trim();
    const password = $password.value;

    if (!username || !password) {
        setFormMessage('Debes escribir usuario y contrasena para registrarte.');

        if (!username) {
            focusField($username);
        } else {
            focusField($password);
        }

        return;
    }

    const result = await api.register({ username, password });
    setFormMessage(result.ok ? 'Cuenta creada. Guarda el codigo de recuperacion.' : result.message, !result.ok);

    if (result.ok) {
        showRecoveryCodeNotice(result.recoveryCode || '');
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

    const username = $username.value.trim();
    const password = $password.value;

    if (!username || !password) {
        setFormMessage('Debes escribir usuario y contrasena.');

        if (!username) {
            focusField($username);
        } else {
            focusField($password);
        }

        return;
    }

    const result = await api.login({
        username,
        password,
        rememberMe: $rememberMe.checked,
    });

    if (!result.ok) {
        setFormMessage(result.message);
        if (String(result.message || '').toLowerCase().includes('usuario no encontrado')) {
            focusField($username);
        } else {
            focusField($password);
        }
        return;
    }

    setFormMessage('');
    showRecoveryCodeNotice('');
});