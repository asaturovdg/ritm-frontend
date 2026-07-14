import { motion, AnimatePresence } from 'framer-motion';
import { useWhatsNew } from './WhatsNewContext.jsx';
import './WhatsNewModal.css';

const MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

export function formatReleaseDate(version) {
  const [, month, day] = version.split('-').map(Number);
  return `${day} ${MONTHS[month - 1]}`;
}

export default function WhatsNewModal() {
  const { visible, dismiss, releases } = useWhatsNew();
  const showHeadings = releases.length > 1;

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
            <div className={showHeadings ? 'whats-new-releases whats-new-releases--scroll' : 'whats-new-releases'}>
              {releases.map((release) => (
                <div className="whats-new-release" key={release.version}>
                  {showHeadings && (
                    <p className="whats-new-release-date">{formatReleaseDate(release.version)}</p>
                  )}
                  <ul className="whats-new-list">
                    {release.items.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <button className="whats-new-btn" onClick={dismiss}>
              Понятно
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
