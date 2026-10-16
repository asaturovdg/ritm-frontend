import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { MessageCircle, MessageSquareWarning, X } from 'lucide-react';

import UxFeedbackModal from '../../pages/Profile/UxFeedbackModal.jsx';
import './FloatingMenu.css';

// Order matters: rendered bottom-to-top, the first item sits closest to the button.
const MENU_ITEMS = [
  { id: 'report', label: 'Сообщить о проблеме', Icon: MessageSquareWarning, category: 'bug' },
  { id: 'feedback', label: 'Обратная связь', Icon: MessageCircle, category: null },
];

export default function FloatingMenu({ tab }) {
  const prefersReduced = useReducedMotion();
  const [isOpen, setIsOpen] = useState(false);
  const [modal, setModal] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  const handleSelect = (item) => {
    setIsOpen(false);
    setModal({ category: item.category });
  };

  const itemTransition = (index) => ({
    duration: prefersReduced ? 0 : 0.18,
    delay: prefersReduced ? 0 : index * 0.04,
  });

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="floating-menu__backdrop"
            data-testid="floating-menu-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReduced ? 0 : 0.18 }}
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      <div className="floating-menu">
        <AnimatePresence>
          {isOpen && (
            <ul className="floating-menu__list">
              {MENU_ITEMS.map((item, index) => (
                <motion.li
                  key={item.id}
                  className="floating-menu__row"
                  initial={{ opacity: 0, y: 12, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 12, scale: 0.9 }}
                  transition={itemTransition(index)}
                >
                  <button
                    type="button"
                    className="floating-menu__item"
                    onClick={() => handleSelect(item)}
                  >
                    <span className="floating-menu__label">{item.label}</span>
                    <span className="floating-menu__item-icon">
                      <item.Icon size={22} strokeWidth={1.8} aria-hidden="true" />
                    </span>
                  </button>
                </motion.li>
              ))}
            </ul>
          )}
        </AnimatePresence>

        <button
          type="button"
          className={`floating-menu__fab${isOpen ? ' floating-menu__fab--open' : ''}`}
          aria-label={isOpen ? 'Закрыть меню' : 'Обратная связь и идеи'}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((v) => !v)}
        >
          {isOpen ? (
            <X size={24} strokeWidth={2} aria-hidden="true" />
          ) : (
            <MessageCircle size={24} strokeWidth={1.8} aria-hidden="true" />
          )}
        </button>
      </div>

      {modal && (
        <UxFeedbackModal initialCategory={modal.category} tab={tab} onClose={() => setModal(null)} />
      )}
    </>
  );
}
