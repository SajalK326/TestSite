/* =========================================================================
   REGISTRATION MODAL — vanilla JS, no globals, IIFE
   Submits JSON + base64 to a Google Apps Script Web App.
   ========================================================================= */
(function () {
  'use strict';

  // ============================================================
  // CONFIG — Edit these two values to go live.
  //   1. APPS_SCRIPT_URL: paste the /exec URL from your Apps Script deployment.
  //   2. WHATSAPP_LINK:   the invite link to show after successful registration.
  // ============================================================
  var REG_CONFIG = {
    APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwOD29Zra3AEOn7E8s-yxBk9_UlZ_Y6DOunwDzbhL9iYDCyMOMAFfZi491KP0vrdcZ6_g/exec',
    WHATSAPP_LINK:   'https://chat.whatsapp.com/LO6ZAV50ECb7bWNayxItaD',
    MAX_FILE_BYTES:  10 * 1024 * 1024,            // 10 MB
    ALLOWED_TYPES:   ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
    SUBMIT_TIMEOUT:  30000                         // 30s
  };

  // ----- Tiny DOM helpers -----
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  // ----- State -----
  var modal, form, successView, fileInput, dropzonePreview, dropzoneName, dropzoneSize;
  var lastTrigger = null;       // element that opened the modal — for focus restore
  var selectedFile = null;      // last picked screenshot File

  /* =================== 1. OPEN / CLOSE =================== */

  function openRegistrationModal(triggerEl) {
    if (!modal) return;
    lastTrigger = triggerEl || document.activeElement;
    modal.showModal();
    document.body.classList.add('reg-modal-open');
    // Focus first interactive field for keyboard users
    var first = $('#reg-form input, #reg-form select, #reg-form button', modal);
    if (first) first.focus();
  }

  function closeRegistrationModal() {
    if (!modal) return;
    if (modal.open) modal.close();
    document.body.classList.remove('reg-modal-open');
    if (lastTrigger && typeof lastTrigger.focus === 'function') {
      lastTrigger.focus();
    }
  }



  /* =================== 3. FILE PICKER =================== */

  function handleFileChange(e) {
    clearFieldError('screenshotFile');
    var file = e.target.files && e.target.files[0];
    selectedFile = null;
    if (!file) {
      dropzoneName.textContent = 'No file chosen';
      dropzoneSize.textContent = '';
      dropzonePreview.innerHTML = '<span>IMG</span>';
      return;
    }
    if (file.size > REG_CONFIG.MAX_FILE_BYTES) {
      showFieldError('screenshotFile', 'Screenshot must be under 10 MB. Compress and try again.');
      e.target.value = '';
      dropzoneName.textContent = 'No file chosen';
      dropzoneSize.textContent = '';
      dropzonePreview.innerHTML = '<span>IMG</span>';
      return;
    }
    if (REG_CONFIG.ALLOWED_TYPES.indexOf(file.type) === -1) {
      showFieldError('screenshotFile', 'Unsupported file type. Use JPG, PNG, or WEBP.');
      e.target.value = '';
      dropzoneName.textContent = 'No file chosen';
      dropzoneSize.textContent = '';
      dropzonePreview.innerHTML = '<span>IMG</span>';
      return;
    }
    selectedFile = file;
    dropzoneName.textContent = file.name;
    dropzoneSize.textContent = formatBytes(file.size) + ' • ' + (file.type.split('/')[1] || 'image').toUpperCase();
    // Show preview thumbnail
    var reader = new FileReader();
    reader.onload = function (ev) {
      dropzonePreview.innerHTML = '';
      var img = document.createElement('img');
      img.src = ev.target.result;
      img.alt = 'Payment screenshot preview';
      dropzonePreview.appendChild(img);
    };
    reader.readAsDataURL(file);
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  /* =================== 4. VALIDATION =================== */

  function showFieldError(name, message) {
    var errEl = $('[data-error-for="' + name + '"]', modal);
    if (errEl) {
      errEl.textContent = message;
      errEl.hidden = false;
    }
    var field = $('[name="' + name + '"]', modal);
    if (field && field.classList) field.classList.add('reg-input-error');
  }

  function clearFieldErrors() {
    $all('.reg-error-msg', modal).forEach(function (el) { el.textContent = ''; el.hidden = true; });
    $all('.reg-input-error', modal).forEach(function (el) { el.classList.remove('reg-input-error'); });
    var banner = $('.reg-form-error', modal);
    if (banner) banner.hidden = true;
  }

  function clearFieldError(name) {
    var errEl = $('[data-error-for="' + name + '"]', modal);
    if (errEl) { errEl.textContent = ''; errEl.hidden = true; }
    var field = $('[name="' + name + '"]', modal);
    if (field && field.classList) field.classList.remove('reg-input-error');
  }

  function valueOf(name) {
    var el = form.elements[name];
    if (!el) return '';
    if (el.type === 'checkbox') return el.checked;
    return (el.value || '').trim();
  }

  function validateForm() {
    var errors = {};
    var rxEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    var rxMobile = /^[6-9]\d{9}$/;
    var rxTxn = /^[A-Za-z0-9]{6,}$/;

    var fullName = valueOf('fullName');
    if (!fullName || fullName.length < 2) errors.fullName = 'Please enter your full name.';

    var email = valueOf('email');
    if (!email) { errors.email = 'Email is required.'; }
    else if (!rxEmail.test(email)) { errors.email = 'Enter a valid email address.'; }
    else if (!/@(stu\.)?upes\.ac\.in$/i.test(email)) {
      // Soft warning: still allowed, but flag
      errors.email = 'Use your UPES email (e.g. name@stu.upes.ac.in).';
    }

    var mobile = valueOf('mobile');
    if (!mobile) errors.mobile = 'Mobile number is required.';
    else if (!rxMobile.test(mobile)) errors.mobile = 'Enter a valid 10-digit Indian mobile number.';

    var dept = valueOf('department');
    if (!dept) errors.department = 'Please enter your school / course / branch.';

    var year = valueOf('year');
    if (!year) errors.year = 'Please select your year of study.';

    var txn = valueOf('txnId');
    if (!txn) errors.txnId = 'Transaction ID is required.';
    else if (!rxTxn.test(txn)) errors.txnId = 'Enter a valid transaction ID (min 6 alphanumeric chars).';

    if (!selectedFile) errors.screenshotFile = 'Please upload a payment screenshot.';

    if (!valueOf('declaration')) errors.declaration = 'You must agree to the rules to register.';

    return { ok: Object.keys(errors).length === 0, errors: errors };
  }

  /* =================== 5. SUBMIT =================== */

  function readFileAsBase64(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload  = function () { resolve(r.result); };
      r.onerror = function () { reject(new Error('Failed to read file.')); };
      r.readAsDataURL(file);
    });
  }

  function setLoading(loading) {
    var btn = $('.reg-submit', form);
    if (!btn) return;
    btn.disabled = !!loading;
    if (loading) {
      btn.dataset.label = btn.dataset.label || btn.textContent;
      btn.innerHTML = '<span class="reg-spinner"></span>Submitting…';
    } else {
      btn.textContent = btn.dataset.label || 'Submit Registration →';
    }
  }

  function showError(message) {
    var banner = $('.reg-form-error', modal);
    if (!banner) return;
    var msgEl = banner.querySelector('.reg-form-error-msg');
    if (msgEl) msgEl.textContent = message;
    banner.hidden = false;
    banner.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function showSuccess(whatsappLink) {
    if (!successView) return;
    form.hidden = true;
    successView.hidden = false;

    // Fill recap
    var recap = $('#reg-success-recap', modal);
    if (recap) {
      var name  = valueOf('fullName') || 'Participant';
      var email = valueOf('email')    || '';
      recap.textContent = name + (email ? ' • ' + email : '');
    }
    // Set WhatsApp link
    var link = $('#reg-whatsapp-link', modal);
    if (link) {
      link.href = whatsappLink || REG_CONFIG.WHATSAPP_LINK;
      link.hidden = !whatsappLink && !REG_CONFIG.WHATSAPP_LINK;
    }
    successView.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function resetSuccess() {
    if (successView) successView.hidden = true;
    if (form) form.hidden = false;
  }

  function buildPayload(b64Screenshot) {
    return {
      eventType:   valueOf('eventType') || 'hackathon',
      fullName:    valueOf('fullName'),
      email:       valueOf('email'),
      mobile:      valueOf('mobile'),
      department:  valueOf('department'),
      year:        valueOf('year'),
      txnId:       valueOf('txnId'),
      screenshot:  selectedFile ? {
        name: selectedFile.name,
        type: selectedFile.type,
        size: selectedFile.size,
        data: b64Screenshot
      } : null
    };
  }

  async function submitForm(ev) {
    ev.preventDefault();
    clearFieldErrors();

    var result = validateForm();
    if (!result.ok) {
      // Map errors to fields
      Object.keys(result.errors).forEach(function (k) {
        if (k.indexOf('memberName-') === 0)   { showFieldError('memberName',  result.errors[k]); return; }
        if (k.indexOf('memberEmail-') === 0)  { showFieldError('memberEmail', result.errors[k]); return; }
        showFieldError(k, result.errors[k]);
      });
      showError('Please fix the highlighted fields and try again.');
      return;
    }

    setLoading(true);

    var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timeoutId = controller ? setTimeout(function () { controller.abort(); }, REG_CONFIG.SUBMIT_TIMEOUT) : null;

    try {
      var dataUrl = await readFileAsBase64(selectedFile);
      var b64 = dataUrl.split(',')[1] || '';  // strip "data:image/...;base64,"
      var payload = buildPayload(b64);

      var fetchOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      };
      if (controller) fetchOptions.signal = controller.signal;

      var res = await fetch(REG_CONFIG.APPS_SCRIPT_URL, fetchOptions);

      // Apps Script returns Content-Type: text/html even when the body is JSON,
      // so we read raw text and parse manually.
      var text = await res.text();
      var data;
      try { data = JSON.parse(text); }
      catch (parseErr) {
        throw new Error('Unexpected response from server. Please try again.');
      }

      if (data && data.success) {
        var link = (data.whatsapp && data.whatsapp.length) ? data.whatsapp : REG_CONFIG.WHATSAPP_LINK;
        showSuccess(link);
      } else {
        showError((data && data.error) || 'Submission failed. Please try again.');
      }
    } catch (err) {
      var msg = 'Submission failed. Check your connection and try again.';
      if (err && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
        msg = 'The server took too long to respond. Please retry.';
      } else if (err && err.message) {
        msg = err.message;
      }
      showError(msg);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setLoading(false);
    }
  }

  /* =================== 6. INIT =================== */

  function initRegistration() {
    modal          = $('#reg-modal');
    form           = $('#reg-form');
    successView    = $('#reg-success-view');
    fileInput      = $('#screenshotFile');
    dropzonePreview = $('#reg-dropzone-preview');
    dropzoneName    = $('#reg-dropzone-name');
    dropzoneSize    = $('#reg-dropzone-size');

    if (!modal || !form) {
      // Modal not on the page — nothing to do
      return;
    }

    // Wire all [data-action="open-registration"] triggers
    $all('[data-action="open-registration"]').forEach(function (el) {
      el.addEventListener('click', function (ev) {
        ev.preventDefault();
        openRegistrationModal(el);
      });
    });

    // Close button
    var closeBtn = $('.reg-close', modal);
    if (closeBtn) closeBtn.addEventListener('click', closeRegistrationModal);

    // Success close button
    var successClose = $('.reg-success-close', modal);
    if (successClose) successClose.addEventListener('click', function () {
      closeRegistrationModal();
      // Reset for next time
      setTimeout(function () {
        resetSuccess();
        form.reset();
        selectedFile = null;
        if (dropzoneName)  dropzoneName.textContent  = 'No file chosen';
        if (dropzoneSize)  dropzoneSize.textContent  = '';
        if (dropzonePreview) dropzonePreview.innerHTML = '<span>IMG</span>';
        clearFieldErrors();
      }, 250);
    });

    // File input change
    if (fileInput) fileInput.addEventListener('change', handleFileChange);

    // Form submit
    form.addEventListener('submit', submitForm);

    // Reset error on input
    form.addEventListener('input', function (e) {
      var t = e.target;
      if (t && t.name) {
        var key = t.name.replace(/\[\]$/, '');
        clearFieldError(key);
      }
    });
    form.addEventListener('change', function (e) {
      var t = e.target;
      if (t && t.name) {
        var key = t.name.replace(/\[\]$/, '');
        clearFieldError(key);
      }
    });

    // Click on backdrop closes the modal.
    // For native <dialog>, the element itself is the event target when the
    // user clicks the backdrop (outside the card). Card-interior clicks
    // bubble, but the target is a card descendant — not the dialog.
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeRegistrationModal();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRegistration);
  } else {
    initRegistration();
  }
})();
