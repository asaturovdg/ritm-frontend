# Профили участников V1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Реализовать согласованный V1 с выборочным раскатом по user ID и отдельным PR.
**Architecture:** Изолированный модуль src/community, существующие AuthContext, роутер и featureFlags. Публичные и owner DTO не смешиваются; состояние живёт в памяти сессии.
**Tech Stack:** React 18, React Router, Vitest, существующий CSS.
**Spec:** docs/superpowers/specs/2026-11-18-member-profiles-design.md

## Global Constraints
- Русский UI; без новых зависимостей, миграций и включения backend-флагов.
- SOCIAL_PROFILES_ALLOWLIST=new Set() по умолчанию; ALL_USERS для общего выпуска.
- Feature-ветка codex/member-profiles-v1 и PR; main не менять.
- Явные draft/submit, generation, ручная модерация, очистка при выходе.

## Review Focus
- Смена сессии во время запроса: старые контакты не появляются.
- Своя запись на второй странице: форма восстанавливается по kind+event_id.
- Ошибка переключателя компании: отображается только подтверждённое состояние.
- Полночь Москвы и неизвестная дата: действия имеют корректные ограничения.
- Скрытая вкладка/рассказ: аналитика чтения прекращается.

### Task 1: API и правила доступа
Files: src/data/featureFlags.js, src/community/{api.js,rules.js,CommunityContext.jsx}, src/community/__tests__/{api,rules,access}.test.*.
Interfaces: useCommunity() -> {enabled, request(path, options), userId, isAdmin}; findOwnContent(request, kind, eventId); eventWindow(event, now); safeMemberReturn(path).
- [x] Написать и запустить падающие тесты выборочного доступа, пагинации, ошибок, разрешённых полей и московских дат.
- [x] Реализовать API и границу сессии, запустить тесты.

### Task 2: Профили и вход
Files: src/community/{MemberProfile.jsx,ProfileEditor.jsx,ContentEditor.jsx,PublicationList.jsx,Community.css}, src/App/App.jsx, src/pages/Profile/Profile.jsx.
Consumes: Task 1 request и правила. Produces: защищённые маршруты /members/:userId, /members/me/edit.
- [x] Падающие тесты восстановления форм, draft/submit, 409, недоступности гостю и возврата после входа.
- [x] Реализовать публичный профиль, редактирование, согласие на контакт, скрытие/отзыв и переходы.
- [x] Запустить тесты.

### Task 3: Сообщество события
Files: src/community/EventCommunity.jsx, src/pages/eventPage/Event.jsx, src/community/__tests__/EventCommunity.test.jsx.
Consumes: API, ContentEditor, PublicationList. Produces: публикации и независимый поиск компании.
- [x] Падающие тесты восстановления своей записи после первой страницы, companion GET и ошибки переключателя.
- [x] Реализовать блок, даты, опубликованный профиль как prerequisite, отдельные DELETE.
- [x] Запустить тесты.

### Task 4: Модерация и аналитика
Files: src/community/{CommunityModeration.jsx,analytics.js,ExperienceReader.jsx}, src/pages/Moderation/Moderation.jsx, src/community/__tests__/{moderation,analytics}.test.*.
Consumes: Task 1 request, DTO публикаций. Produces: очередь и действия админа, события чтения.
- [x] Падающие тесты запрета собственного approve, 409 и reason, подтверждения open до interval, фонового/неактивного чтения.
- [x] Реализовать очередь, сравнение опубликованного снимка, unpublish и аналитику с UUID.
- [x] Запустить тесты.

### Task 5: Проверка и PR
- [x] npm test, npm run build, npm run lint; исправить новые ошибки.
- [x] Независимое ревью всей ветки, устранить существенные замечания с проверками.
- [x] Проверить в браузере через /browse, если окружение доступно; E2E стенда не подменять моками.
- [x] Коммит и PR с инструкцией раската по ID, backend-зависимостями и статусом E2E.

## Выполнение и проверка
- Работа выполнена в существующей согласованной feature-ветке. Временные локальные фикстуры удалены.
- Ревью выявило обход refresh при 401 и неправильную границу рассказа при неизвестном начале; оба исправлены с тестами. Браузер выявил null user_id при старте; добавлен регрессионный тест и исправление.
- Локальный /browse: 390 px, форма/черновик/submit с согласием, публичный профиль, очередь, блок события. Мок API, не E2E стенда.
- Полный suite и lint содержат исходные несвязанные ошибки NOT_INTERESTED_ALLOWLIST и старого кода. Результаты подробно в PR.
