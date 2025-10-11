import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext.jsx';
import Modal from './Modal.jsx';

const roleCopy = {
  agent: {
    title: 'Agent sifatida kirish',
    description:
      'Oylik rejalar, buyurtmalar va tashriflaringizni kuzatish uchun shaxsiy kabinetingizga kiring.'
  },
  admin: {
    title: 'Admin sifatida kirish',
    description:
      'Mahsulotlar, agentlar va do\'konlarni boshqarish hamda strategik ko\'rsatkichlarni kuzatish uchun kirish.'
  }
};

export default function LoginModal({ isOpen, onClose, initialRole = 'agent', onLoggedIn }) {
  const [role, setRole] = useState(initialRole);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('+998');
  const [isSubmitting, setSubmitting] = useState(false);
  const { login, addToast } = useAppContext();

  const copy = roleCopy[role];

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const user = await login({ fullName, phone, role });
      addToast({
        variant: 'success',
        title: 'Xush kelibsiz!',
        description: `${user.name} profili faollashtirildi.`
      });
      onLoggedIn(user);
      onClose();
      setFullName('');
      setPhone('+998');
    } catch (error) {
      addToast({
        variant: 'error',
        title: 'Kirish amalga oshmadi',
        description: error.message ?? 'Iltimos, ma\'lumotlarni tekshiring.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={copy.title}
      description={copy.description}
      actions={
        <button
          type="submit"
          form="login-form"
          className="btn-primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Yuklanmoqda...' : 'Kirish'}
        </button>
      }
    >
      <form id="login-form" className="form-grid" onSubmit={handleSubmit}>
        <label className="input-field">
          <span>I.F.Sh.</span>
          <input
            type="text"
            placeholder="To'liq ism sharifingiz"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
          />
        </label>
        <label className="input-field">
          <span>Telefon raqami</span>
          <input
            type="tel"
            placeholder="+998 90 123 45 67"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            required
          />
        </label>
        <div className="role-switch">
          <button
            type="button"
            className={role === 'agent' ? 'role-btn active' : 'role-btn'}
            onClick={() => setRole('agent')}
          >
            Agent
          </button>
          <button
            type="button"
            className={role === 'admin' ? 'role-btn active' : 'role-btn'}
            onClick={() => setRole('admin')}
          >
            Admin
          </button>
        </div>
      </form>
    </Modal>
  );
}
