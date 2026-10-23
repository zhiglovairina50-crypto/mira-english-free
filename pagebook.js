/* MIRA English: free page-by-page companion navigation. No textbook copies or paid APIs. */
(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const pageInput = byId('bookPage');
  const findButton = byId('findBookPage');
  const quick = byId('pageBookQuick');
  const sheet = byId('pageBookSheet');
  const jumps = byId('pageBookUnits');
  const prev = byId('bookPrevPage');
  const next = byId('bookNextPage');
  if (!pageInput || !findButton || !quick || !sheet || !prev || !next || !window.MiraLearning) return;
  const units = window.MiraLearning.catalog().units;
  const add = (parent, tag, className, content) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (content !== undefined) element.textContent = content;
    parent.append(element);
    return element;
  };
  function pageInfo(page) {
    const unitIndex = units.findIndex(unit => page >= unit.pages[0] && page <= unit.pages[1]);
    if (unitIndex >= 0) return {title: units[unitIndex].en + ' · ' + units[unitIndex].ru, indices: [unitIndex], type: 'unit'};
    const review = [
      {start: 30, end: 31, title: 'Повторяем Units 1–3', indices: [0, 1, 2]},
      {start: 48, end: 49, title: 'Повторяем Units 4–5', indices: [3, 4]},
      {start: 74, end: 75, title: 'Повторяем Units 6–8', indices: [5, 6, 7]},
      {start: 92, end: 95, title: 'Повторяем Units 9–10', indices: [8, 9]}
    ].find(row => page >= row.start && page <= row.end);
    if (review) return {title: review.title, indices: review.indices, type: 'review'};
    if (page < 6) return {title: 'Начальные страницы', indices: [], type: 'unmapped'};
    if (page <= 103) return {title: 'Dialogue of Cultures', indices: [], type: 'unmapped'};
    if (page <= 112) return {title: 'Exam Focus', indices: [], type: 'unmapped'};
    if (page <= 115) return {title: 'Student activities', indices: [], type: 'unmapped'};
    return {title: 'Приложения / словарь', indices: [], type: 'unmapped'};
  }
  function goTo(page) {
    if (!Number.isInteger(page) || page < 1 || page > 140) return;
    pageInput.value = String(page);
    findButton.click();
  }
  function refresh() {
    const page = Number(pageInput.value);
    quick.replaceChildren();
    sheet.replaceChildren();
    if (!Number.isInteger(page) || page < 1 || page > 140) {
      add(sheet, 'p', 'book-page-caution', 'Введи номер страницы от 1 до 140.');
      prev.disabled = true;
      next.disabled = true;
      return;
    }
    prev.disabled = page === 1;
    next.disabled = page === 140;
    const start = Math.max(1, Math.min(134, page - 3));
    for (let p = start; p <= Math.min(140, start + 6); p++) {
      const button = add(quick, 'button', 'book-page-number' + (p === page ? ' is-current' : ''), String(p));
      button.type = 'button';
      button.setAttribute('aria-label', 'Открыть страницу ' + p);
      button.setAttribute('aria-pressed', String(p === page));
      button.onclick = () => goTo(p);
    }
    const info = pageInfo(page);
    add(sheet, 'div', 'book-page-overline', 'FORWARD 8 · СТРАНИЦА ' + page);
    add(sheet, 'h4', 'book-page-heading', info.title);
    if (info.type === 'unit') {
      add(sheet, 'p', 'book-page-caution',
        'Здесь показана тема раздела, к которому ориентировочно относится страница. Точные упражнения и текст страницы в MIRA не загружены.');
    } else if (info.type === 'review') {
      add(sheet, 'p', 'book-page-caution',
        'Это раздел повторения по ориентировочной карте. Ниже — наши авторские тренировочные уроки, а не упражнения из книги.');
    } else {
      add(sheet, 'p', 'book-page-caution',
        'Для этой страницы нет подтверждённой привязки к конкретным упражнениям. Чтобы заниматься по ней, держи рядом свой учебник.');
    }
    if (info.indices.length) {
      add(sheet, 'div', 'book-page-subhead', 'Объяснения Миры для тренировки');
      const lessons = add(sheet, 'div', 'book-page-lesson-list');
      for (const i of info.indices) {
        for (const lesson of units[i].lessons) {
          const button = add(lessons, 'button', 'book-page-lesson', lesson.title + ' →');
          button.type = 'button';
          button.onclick = () => window.MiraLearning.openLesson(lesson.id);
        }
      }
    }
    const link = add(sheet, 'a', 'book-page-link', 'Открыть оригинальный учебник у издателя ↗');
    link.href = 'https://media.prosv.ru/content/item/55/';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }
  prev.onclick = () => goTo(Number(pageInput.value) - 1);
  next.onclick = () => goTo(Number(pageInput.value) + 1);
  findButton.addEventListener('click', refresh);
  pageInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') refresh();
  });
  pageInput.addEventListener('change', refresh);
  if (jumps) {
    for (const [index, unit] of units.entries()) {
      const button = add(jumps, 'button', 'book-page-unit', 'Unit ' + (index + 1) + ' · стр. ' + unit.pages[0] + '–' + unit.pages[1]);
      button.type = 'button';
      button.onclick = () => goTo(unit.pages[0]);
    }
  }
  // Trigger the already present page/topic mapping and render our companion sheet.
  findButton.click();
})();
