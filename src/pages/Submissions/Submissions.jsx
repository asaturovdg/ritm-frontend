import { useState, useEffect } from "react";
import { useAuth } from "../../components/AuthContext.jsx";
import { useToast } from "../../components/Toast/ToastContext.jsx";
import "./Submissions.css";
import SubmissionsList from "./SubmissionsList.jsx";
import SubmissionForm from "./SubmissionForm.jsx";

export default function Submissions() {
  const { token, userId } = useAuth();
  const showToast = useToast();
  const [activeMainTab, setActiveMainTab] = useState('create');
  const [isCompleted, setIsCompleted] = useState(false);

  // Состояния для входа в форму в режиме редактирования/повторной отправки
  const [formMode, setFormMode] = useState('create');
  const [formTarget, setFormTarget] = useState(null);

  // Состояния для заявок
  const [submissions, setSubmissions] = useState([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [hasLoadedSubmissionsOnce, setHasLoadedSubmissionsOnce] = useState(false);

  const fetchUserSubmissions = async () => {
    if (!token || !userId) return;

    const silent = hasLoadedSubmissionsOnce;
    if (!silent) setIsLoadingSubmissions(true);
    try {
      const response = await fetch(`https://ritmevents.ru/api/v1/users/${userId}/submissions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSubmissions(data);
        setHasLoadedSubmissionsOnce(true);
      } else {
        showToast('Не удалось загрузить заявки. Попробуйте ещё раз');
      }
    } catch {
      showToast('Не удалось загрузить заявки. Попробуйте ещё раз');
    } finally {
      if (!silent) setIsLoadingSubmissions(false);
    }
  };

  useEffect(() => {
    if (activeMainTab === 'mySubmissions' && token) {
      fetchUserSubmissions();
    }
  }, [activeMainTab, token]);

  const resetToCreate = () => {
    setFormMode('create');
    setFormTarget(null);
    setIsCompleted(false);
  };

  const handleEdit = (submission) => {
    setFormMode('edit');
    setFormTarget(submission);
    setActiveMainTab('create');
  };

  const handleResubmit = (submission) => {
    setFormMode('create');
    setFormTarget(submission);
    setActiveMainTab('create');
  };

  const handleFormDone = (mode) => {
    if (mode === 'edit') {
      showToast('Заявка обновлена');
      resetToCreate();
      setActiveMainTab('mySubmissions');
      fetchUserSubmissions();
    } else {
      setIsCompleted(true);
    }
  };

  if (isCompleted && activeMainTab === 'create') {
    return (
      <div className="submissions-container">
        <div className="completed-screen">
          <div className="completion-card">
            <h2>Заявка отправлена!</h2>
            <button onClick={() => {
              resetToCreate();
              setActiveMainTab('mySubmissions');
              fetchUserSubmissions();
            }} className="submit-btn">
              Посмотреть мои заявки
            </button>
            <button onClick={resetToCreate} className="reset-filters__btn" style={{ marginTop: '10px' }}>
              Предложить ещё событие
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="submissions-container">
      <div className="profileTabs">
        <button
          className={`profile-tab ${activeMainTab === 'create' ? 'active' : ''}`}
          onClick={() => {
            setActiveMainTab('create');
            resetToCreate();
          }}
        >
          Создать событие
        </button>
        <button
          className={`profile-tab ${activeMainTab === 'mySubmissions' ? 'active' : ''}`}
          onClick={() => setActiveMainTab('mySubmissions')}
        >
          Мои заявки
        </button>
      </div>

      {activeMainTab === 'create' && (
        <SubmissionForm
          key={formTarget?.id || 'create'}
          mode={formMode}
          editingId={formMode === 'edit' ? formTarget?.id : null}
          initialValues={formTarget}
          token={token}
          onDone={handleFormDone}
        />
      )}

      {activeMainTab === 'mySubmissions' && (
        <SubmissionsList
          submissions={submissions}
          isLoading={isLoadingSubmissions}
          hasLoadedOnce={hasLoadedSubmissionsOnce}
          token={token}
          userId={userId}
          onRefetch={fetchUserSubmissions}
          onCreateNew={() => setActiveMainTab('create')}
          onEdit={handleEdit}
          onResubmit={handleResubmit}
        />
      )}
    </div>
  );
}
