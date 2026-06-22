import { motion, AnimatePresence } from 'framer-motion';
import { useWhatsNew } from './WhatsNewContext.jsx';
import './WhatsNewModal.css';

export default function WhatsNewModal() {
  const { visible, dismiss, items } = useWhatsNew();

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="whats-new-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={dismiss}
        >
          <motion.div
            className="whats-new-card"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="whats-new-title">Что нового</p>
            <ul className="whats-new-list">
              {items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
            <button className="whats-new-btn" onClick={dismiss}>
              Понятно
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
