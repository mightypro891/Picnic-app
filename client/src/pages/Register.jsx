import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import { useEvent } from '../hooks/useEvent.js';
import { submitRegistration } from '../api/registrations.js';
import './Register.css';

const LEVELS = ['100', '200', '300', '400', '500', 'PG', 'Other'];
const MAX_FILE_MB = 5;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const EMPTY_FORM = { fullName: '', matricNumber: '', level: '', phone: '', email: '', website: '' };

export default function Register() {
  const { event } = useEvent();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  function updateField(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined }));
  }

  function onFileChange(e) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!ACCEPTED_TYPES.includes(selected.type)) {
      setErrors((prev) => ({ ...prev, paymentEvidence: 'Upload a JPG, PNG, WEBP, or PDF file.' }));
      return;
    }
    if (selected.size > MAX_FILE_MB * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, paymentEvidence: `File must be under ${MAX_FILE_MB}MB.` }));
      return;
    }

    setErrors((prev) => ({ ...prev, paymentEvidence: undefined }));
    setFile(selected);
    setPreview(selected.type.startsWith('image/') ? URL.createObjectURL(selected) : 'pdf');
  }

  function removeFile() {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function validateClientSide() {
    const next = {};
    if (!form.fullName.trim() || form.fullName.trim().length < 3) next.fullName = 'Enter your full name.';
    if (!form.matricNumber.trim()) next.matricNumber = 'Enter your matric number.';
    if (!form.level) next.level = 'Select your level.';
    if (!form.phone.trim()) next.phone = 'Enter your phone number.';
    if (!form.email.trim() || !/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Enter a valid email address.';
    if (!file) next.paymentEvidence = 'Upload your payment evidence.';
    return next;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setFormError('');

    const clientErrors = validateClientSide();
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors);
      return;
    }

    setSubmitting(true);
    try {
      const data = new FormData();
      Object.entries(form).forEach(([key, value]) => data.append(key, value));
      data.append('paymentEvidence', file);

      const result = await submitRegistration(data);
      navigate('/register/success', { state: { accessToken: result.accessToken } });
    } catch (err) {
      if (err.fields) {
        setErrors(err.fields);
      }
      setFormError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Navbar />
      <main>
        <section className="section register">
          <div className="container register__container">
            <div className="register__intro">
              <span className="eyebrow">Registration</span>
              <h1 style={{ marginBottom: 10 }}>Register for {event.name}</h1>
              <p>
                Already paid the designated EXCO member? Fill in your details below and upload your payment
                evidence. We'll review it and email your ticket once verified.
              </p>
              <div className="register__fee-note">
                <strong>Fee: {event.fee}</strong> — paid directly to the EXCO. This form does not process
                payments.
              </div>
            </div>

            <form className="card register__form" onSubmit={onSubmit} noValidate>
              {/* Honeypot: invisible to real visitors, but a bot's autofill script
                  will often fill any field it finds. If this has a value, we know
                  the submission wasn't from a person — see createRegistration on
                  the server, which silently discards it. */}
              <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}>
                <label htmlFor="website">Leave this field blank</label>
                <input
                  id="website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.website}
                  onChange={(e) => updateField('website', e.target.value)}
                />
              </div>

              <h2 style={{ fontSize: '1.15rem', marginBottom: 20 }}>Personal information</h2>

              <div className="field">
                <label htmlFor="fullName">Full name</label>
                <input
                  id="fullName"
                  className={`input ${errors.fullName ? 'has-error' : ''}`}
                  value={form.fullName}
                  onChange={(e) => updateField('fullName', e.target.value)}
                  autoComplete="name"
                />
                {errors.fullName && <p className="error">{errors.fullName}</p>}
              </div>

              <div className="field-row">
                <div className="field">
                  <label htmlFor="matricNumber">Matric number</label>
                  <input
                    id="matricNumber"
                    className={`input ${errors.matricNumber ? 'has-error' : ''}`}
                    value={form.matricNumber}
                    onChange={(e) => updateField('matricNumber', e.target.value)}
                  />
                  {errors.matricNumber && <p className="error">{errors.matricNumber}</p>}
                </div>

                <div className="field">
                  <label htmlFor="level">Level</label>
                  <select
                    id="level"
                    className={`input ${errors.level ? 'has-error' : ''}`}
                    value={form.level}
                    onChange={(e) => updateField('level', e.target.value)}
                  >
                    <option value="">Select level</option>
                    {LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>{lvl}{/^\d+$/.test(lvl) ? ' Level' : ''}</option>
                    ))}
                  </select>
                  {errors.level && <p className="error">{errors.level}</p>}
                </div>
              </div>

              <div className="field-row">
                <div className="field">
                  <label htmlFor="phone">Phone number</label>
                  <input
                    id="phone"
                    className={`input ${errors.phone ? 'has-error' : ''}`}
                    value={form.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    autoComplete="tel"
                    type="tel"
                  />
                  {errors.phone && <p className="error">{errors.phone}</p>}
                </div>

                <div className="field">
                  <label htmlFor="email">Email address</label>
                  <input
                    id="email"
                    className={`input ${errors.email ? 'has-error' : ''}`}
                    value={form.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    autoComplete="email"
                    type="email"
                  />
                  {errors.email && <p className="error">{errors.email}</p>}
                  <p className="hint">Your ticket will be sent to this address.</p>
                </div>
              </div>

              <hr className="register__divider" />

              <h2 style={{ fontSize: '1.15rem', marginBottom: 8 }}>Payment evidence</h2>
              <p style={{ marginTop: 0, marginBottom: 16 }}>
                Upload a clear screenshot or receipt showing your payment to the designated EXCO.
              </p>

              <div className="field">
                <label htmlFor="paymentEvidence">Upload file</label>

                {!file && (
                  <label htmlFor="paymentEvidence" className={`upload-drop ${errors.paymentEvidence ? 'has-error' : ''}`}>
                    <span className="upload-drop__icon" aria-hidden="true">📎</span>
                    <span>
                      <strong>Click to upload</strong> or drag a file here
                    </span>
                    <span className="hint">JPG, PNG, WEBP, or PDF · up to {MAX_FILE_MB}MB</span>
                  </label>
                )}

                <input
                  ref={fileInputRef}
                  id="paymentEvidence"
                  type="file"
                  accept={ACCEPTED_TYPES.join(',')}
                  onChange={onFileChange}
                  className="visually-hidden"
                />

                {file && (
                  <div className="upload-preview">
                    {preview && preview !== 'pdf' ? (
                      <img src={preview} alt="Payment evidence preview" />
                    ) : (
                      <div className="upload-preview__pdf">📄</div>
                    )}
                    <div className="upload-preview__meta">
                      <p style={{ margin: 0, fontWeight: 600, wordBreak: 'break-all' }}>{file.name}</p>
                      <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-ink-soft)' }}>
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={removeFile}>
                      Remove
                    </button>
                  </div>
                )}

                {errors.paymentEvidence && <p className="error">{errors.paymentEvidence}</p>}
              </div>

              {formError && <p className="error" style={{ marginBottom: 16 }}>{formError}</p>}

              <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit Registration'}
              </button>
            </form>
          </div>
        </section>
      </main>
      <Footer event={event} />
    </>
  );
}
